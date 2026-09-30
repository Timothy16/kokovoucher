-- Stage 1: restaurant lifecycle.
-- These functions are called only by the server (service role); browsers cannot execute them.

-- ---------- release a reserved voucher (shared with Stage 4 cancel/reject) ----------
-- Puts a RESERVED voucher back to ISSUED, or to EXPIRED if its window has passed,
-- and records the event. Returns true when the customer can use it again.
create or replace function public.release_voucher(p_voucher_id uuid, p_note text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.voucher_status;
begin
  update public.vouchers v
  set status = case when v.expires_at < now() then 'expired'::public.voucher_status else 'issued'::public.voucher_status end,
      redeem_method = null
  where v.id = p_voucher_id and v.status = 'reserved'
  returning v.status into v_status;

  if v_status is null then
    return false;  -- not reserved (already released/redeemed): nothing to do
  end if;

  insert into public.voucher_events (voucher_id, type, note)
  values (p_voucher_id, case when v_status = 'issued' then 'released'::public.voucher_event_type else 'expired'::public.voucher_event_type end, p_note);

  return v_status = 'issued';
end;
$$;

-- ---------- disable (rule 22) ----------
-- In one transaction: mark the restaurant disabled, cancel every in-flight delivery order
-- (placed, received or dispatched) and release its voucher. Returns the released orders so
-- the server can notify each customer.
create or replace function public.disable_restaurant(p_restaurant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
  v_note constant text := 'Restaurant was disabled by admin before this order could be fulfilled.';
  v_released boolean;
  v_result jsonb := '[]'::jsonb;
begin
  update public.restaurants
  set status = 'disabled', disabled_at = now()
  where id = p_restaurant_id and status = 'active';
  if not found then
    raise exception 'RESTAURANT_NOT_ACTIVE';
  end if;

  for o in
    select ord.id, ord.reference, ord.voucher_id, v.customer_email, v.customer_phone
    from public.orders ord
    join public.vouchers v on v.id = ord.voucher_id
    where ord.restaurant_id = p_restaurant_id and ord.status in ('placed', 'received', 'dispatched')
    for update of ord
  loop
    update public.orders set status = 'cancelled' where id = o.id;
    insert into public.order_status_history (order_id, status, note) values (o.id, 'cancelled', v_note);
    v_released := public.release_voucher(o.voucher_id, v_note);
    v_result := v_result || jsonb_build_object(
      'order_id', o.id,
      'reference', o.reference,
      'customer_email', o.customer_email,
      'customer_phone', o.customer_phone,
      'voucher_released', v_released
    );
  end loop;

  return v_result;
end;
$$;

-- ---------- currency guard (rule 20, tightened) ----------
-- Changing a restaurant's currency would mix currencies in its payout balance. Block it while
-- anything is still owed OR any delivery order is in flight (those vouchers were matched against
-- the old currency and will credit in it when delivered). Enforced here so no code path can skip it.
create or replace function public.guard_restaurant_currency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.currency is distinct from old.currency then
    if exists (select 1 from public.payout_items where restaurant_id = new.id and status = 'pending') then
      raise exception 'CURRENCY_LOCKED_PENDING_BALANCE';
    end if;
    if exists (select 1 from public.orders where restaurant_id = new.id and status in ('placed', 'received', 'dispatched')) then
      raise exception 'CURRENCY_LOCKED_OPEN_ORDERS';
    end if;
  end if;
  return new;
end;
$$;

create trigger restaurants_currency_guard before update of currency on public.restaurants
  for each row execute function public.guard_restaurant_currency();

-- ---------- is an email already a login? ----------
-- A restaurant's contact email becomes its login, so it must not collide with an existing
-- account (e.g. the admin). Checked when the restaurant is created, not at invite acceptance.
create or replace function public.auth_email_in_use(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where lower(email) = lower(btrim(p_email)))
$$;

revoke execute on function public.release_voucher(uuid, text) from public, anon, authenticated;
revoke execute on function public.disable_restaurant(uuid) from public, anon, authenticated;
revoke execute on function public.auth_email_in_use(text) from public, anon, authenticated;
grant execute on function public.release_voucher(uuid, text) to service_role;
grant execute on function public.disable_restaurant(uuid) to service_role;
grant execute on function public.auth_email_in_use(text) to service_role;
