-- Stage 4: delivery orders. All functions are called only by the server (service role).
-- Credential failures are RETURNED (never raised) so the attempt counter they bump is committed.

-- The order carries its own value and currency (snapshot of the voucher at order time), so the
-- restaurant can see what it will be credited without any access to the vouchers table.
alter table public.orders
  add column amount numeric(14, 2) not null check (amount > 0),
  add column currency public.currency not null;

-- ---------- voucher code + secret key check (rule 18) — shared with Stage 5 walk-ins ----------
-- Locks the voucher row for the rest of the caller's transaction. Wrong key → attempt counted,
-- locked at 5. Code-not-found and wrong-key look identical (INVALID). Only once the key is right
-- do we reveal why a voucher can't be used (void / used / expired / held by an order).
create or replace function public.check_voucher_credentials(p_code text, p_secret_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_attempts constant integer := 5;
  v_raw text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_code text := case when length(v_raw) = 8 then substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4) else v_raw end;
  v public.vouchers;
begin
  select * into v from public.vouchers where code = v_code for update;
  if v.id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID');
  end if;

  if v.locked_at is not null or v.verify_attempts >= c_max_attempts then
    return jsonb_build_object('ok', false, 'reason', 'LOCKED');
  end if;

  if v.secret_key_normalized <> lower(btrim(coalesce(p_secret_key, ''))) then
    update public.vouchers
    set verify_attempts = verify_attempts + 1,
        locked_at = case when verify_attempts + 1 >= c_max_attempts then now() else null end
    where id = v.id
    returning * into v;
    return jsonb_build_object('ok', false, 'reason', case when v.locked_at is not null then 'LOCKED' else 'INVALID' end);
  end if;

  if v.status = 'void' then
    return jsonb_build_object('ok', false, 'reason', 'NOT_AVAILABLE');
  end if;
  if v.status = 'redeemed' then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_USED');
  end if;
  if v.status = 'reserved' then
    return jsonb_build_object('ok', false, 'reason', 'IN_USE');
  end if;
  if v.status = 'expired' or v.expires_at < now() then
    if v.status = 'issued' then
      update public.vouchers set status = 'expired' where id = v.id;
      insert into public.voucher_events (voucher_id, type) values (v.id, 'expired');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'EXPIRED');
  end if;

  return jsonb_build_object('ok', true, 'voucher_id', v.id, 'currency', v.currency, 'amount', v.amount);
end;
$$;

-- ---------- place an order (rules 4, 8, 24, 25) ----------
create or replace function public.place_order(
  p_code text,
  p_secret_key text,
  p_combo_id uuid,
  p_spice public.spice_level,
  p_drink text,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_whatsapp text,
  p_house_name text,
  p_house_number text,
  p_floor text,
  p_landmark text,
  p_drop public.drop_option,
  p_additional_info text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_check jsonb;
  v public.vouchers;
  c public.combos;
  r public.restaurants;
  o public.orders;
  v_drinks text[];
  v_ref text;
  v_attempt integer := 0;
  v_constraint text;
begin
  v_check := public.check_voucher_credentials(p_code, p_secret_key);
  if not (v_check ->> 'ok')::boolean then
    return v_check;
  end if;
  select * into v from public.vouchers where id = (v_check ->> 'voucher_id')::uuid;

  -- FOR SHARE: a concurrent disable/edit waits for this order, then sees (and handles) it.
  select * into c from public.combos where id = p_combo_id for share;
  if c.id is null or not c.available then
    return jsonb_build_object('ok', false, 'reason', 'COMBO_UNAVAILABLE');
  end if;
  select * into r from public.restaurants where id = c.restaurant_id for share;
  if r.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'RESTAURANT_UNAVAILABLE');
  end if;
  if r.currency <> v.currency then
    return jsonb_build_object('ok', false, 'reason', 'CURRENCY_MISMATCH', 'voucher_currency', v.currency);
  end if;
  if c.spice_option and p_spice is null then
    return jsonb_build_object('ok', false, 'reason', 'SPICE_REQUIRED');
  end if;
  v_drinks := c.soda_options || case when c.water_option then array['Water'] else '{}'::text[] end;
  if cardinality(v_drinks) > 0 and (p_drink is null or not (p_drink = any (v_drinks))) then
    return jsonb_build_object('ok', false, 'reason', 'DRINK_REQUIRED');
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_ref := 'KV-';
    for i in 1..6 loop
      v_ref := v_ref || substr(c_alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32), 1);
    end loop;
    begin
      insert into public.orders (
        reference, voucher_id, combo_id, restaurant_id, amount, currency, spice_level, drink_choice,
        delivery_name, delivery_phone, delivery_whatsapp, house_name, house_number, floor, landmark, drop_option, additional_info
      ) values (
        v_ref, v.id, c.id, r.id, v.amount, v.currency,
        case when c.spice_option then p_spice end,
        case when cardinality(v_drinks) > 0 then p_drink end,
        btrim(p_delivery_name), btrim(p_delivery_phone), btrim(p_delivery_whatsapp), btrim(p_house_name), btrim(p_house_number), btrim(p_floor),
        nullif(btrim(p_landmark), ''), p_drop, nullif(btrim(p_additional_info), '')
      )
      returning * into o;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'orders_one_live_per_voucher' then
        return jsonb_build_object('ok', false, 'reason', 'IN_USE');
      end if;
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  insert into public.order_status_history (order_id, status) values (o.id, 'placed');
  update public.vouchers set status = 'reserved', redeem_method = 'delivery' where id = v.id;
  insert into public.voucher_events (voucher_id, type, note) values (v.id, 'reserved', 'Order ' || o.reference);

  return jsonb_build_object(
    'ok', true,
    'order_id', o.id,
    'reference', o.reference,
    'amount', o.amount,
    'currency', o.currency,
    'combo_name', c.name,
    'restaurant_name', r.name,
    'restaurant_email', r.contact_email,
    'customer_name', v.customer_full_name,
    'customer_email', v.customer_email,
    'customer_phone', v.customer_phone
  );
end;
$$;

-- ---------- restaurant moves an order along (rules 7, 9) ----------
-- placed → received → dispatched → delivered, or placed/received → rejected.
-- Delivered: voucher redeemed + a payout item for the full value. Rejected: voucher released.
create or replace function public.advance_order(p_order_id uuid, p_restaurant_id uuid, p_next public.order_status, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v public.vouchers;
  v_note constant text := nullif(btrim(p_note), '');
  v_released boolean := false;
begin
  select * into o from public.orders where id = p_order_id and restaurant_id = p_restaurant_id for update;
  if o.id is null then
    return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;

  if not (
    (o.status = 'placed' and p_next = 'received') or
    (o.status = 'received' and p_next = 'dispatched') or
    (o.status = 'dispatched' and p_next = 'delivered') or
    (o.status in ('placed', 'received') and p_next = 'rejected')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'BAD_TRANSITION', 'status', o.status);
  end if;

  update public.orders set status = p_next where id = o.id;
  insert into public.order_status_history (order_id, status, note) values (o.id, p_next, v_note);

  if p_next = 'delivered' then
    update public.vouchers set status = 'redeemed', redeemed_at = now()
    where id = o.voucher_id and status = 'reserved';
    if not found then
      raise exception 'VOUCHER_NOT_RESERVED';  -- integrity breach: roll everything back
    end if;
    insert into public.voucher_events (voucher_id, type, note) values (o.voucher_id, 'redeemed_delivery', 'Order ' || o.reference);
    insert into public.payout_items (restaurant_id, source_type, source_id, amount, currency)
    values (o.restaurant_id, 'order', o.id, o.amount, o.currency);
  elsif p_next = 'rejected' then
    v_released := public.release_voucher(o.voucher_id, 'Order ' || o.reference || ' rejected' || coalesce(': ' || v_note, ''));
  end if;

  select * into v from public.vouchers where id = o.voucher_id;
  return jsonb_build_object(
    'ok', true,
    'reference', o.reference,
    'status', p_next,
    'voucher_released', v_released,
    'customer_name', v.customer_full_name,
    'customer_email', v.customer_email,
    'customer_phone', v.customer_phone
  );
end;
$$;

-- ---------- customer reports a problem with a delivered order ----------
create or replace function public.report_order_problem(p_reference text, p_secret_key text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_key text;
  v_restaurant text;
begin
  select * into o from public.orders where reference = upper(btrim(coalesce(p_reference, ''))) for update;

  select v.secret_key_normalized into v_key from public.vouchers v where v.id = o.voucher_id;
  if o.id is null or v_key is distinct from lower(btrim(coalesce(p_secret_key, ''))) then
    return jsonb_build_object('ok', false, 'reason', 'NO_MATCH');
  end if;
  if o.status <> 'delivered' then
    return jsonb_build_object('ok', false, 'reason', 'NOT_DELIVERED');
  end if;
  if o.dispute_status is not null then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_REPORTED');
  end if;

  update public.orders
  set dispute_status = 'open', dispute_note = nullif(btrim(p_note), ''), dispute_reported_at = now()
  where id = o.id;

  select name into v_restaurant from public.restaurants where id = o.restaurant_id;
  return jsonb_build_object('ok', true, 'order_id', o.id, 'reference', o.reference, 'restaurant_name', v_restaurant);
end;
$$;

revoke execute on function public.check_voucher_credentials(text, text) from public, anon, authenticated;
revoke execute on function public.place_order(text, text, uuid, public.spice_level, text, text, text, text, text, text, text, text, public.drop_option, text) from public, anon, authenticated;
revoke execute on function public.advance_order(uuid, uuid, public.order_status, text) from public, anon, authenticated;
revoke execute on function public.report_order_problem(text, text, text) from public, anon, authenticated;
grant execute on function public.check_voucher_credentials(text, text) to service_role;
grant execute on function public.place_order(text, text, uuid, public.spice_level, text, text, text, text, text, text, text, text, public.drop_option, text) to service_role;
grant execute on function public.advance_order(uuid, uuid, public.order_status, text) to service_role;
grant execute on function public.report_order_problem(text, text, text) to service_role;
