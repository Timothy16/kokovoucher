-- Stage 5: walk-in redemption (rules 4, 8, 10). Called only by the server (service role).
-- Credentials are re-checked inside the same transaction that redeems, so a voucher can't be
-- used twice even if two tills submit it at the same moment.
create or replace function public.complete_walkin(p_code text, p_secret_key text, p_restaurant_id uuid, p_bill numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_check jsonb;
  v public.vouchers;
  r public.restaurants;
  w public.walk_ins;
  v_credited numeric(14, 2);
begin
  if p_bill is null or p_bill <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'BAD_BILL');
  end if;

  v_check := public.check_voucher_credentials(p_code, p_secret_key);
  if not (v_check ->> 'ok')::boolean then
    return v_check;
  end if;
  select * into v from public.vouchers where id = (v_check ->> 'voucher_id')::uuid;

  select * into r from public.restaurants where id = p_restaurant_id for share;
  if r.id is null or r.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'RESTAURANT_UNAVAILABLE');
  end if;
  if r.currency <> v.currency then
    return jsonb_build_object('ok', false, 'reason', 'CURRENCY_MISMATCH', 'voucher_currency', v.currency);
  end if;
  if v.currency <> 'USD' and p_bill <> trunc(p_bill) then
    return jsonb_build_object('ok', false, 'reason', 'BAD_BILL');
  end if;

  -- Rule 10: credit min(voucher, bill); any remainder is forfeited, not banked.
  v_credited := least(v.amount, p_bill);

  insert into public.walk_ins (voucher_id, restaurant_id, currency, bill_amount, credited_amount, forfeited_amount)
  values (v.id, r.id, v.currency, p_bill, v_credited, v.amount - v_credited)
  returning * into w;

  insert into public.payout_items (restaurant_id, source_type, source_id, amount, currency)
  values (r.id, 'walk_in', w.id, v_credited, v.currency);

  update public.vouchers set status = 'redeemed', redeem_method = 'walk_in', redeemed_at = now() where id = v.id;
  insert into public.voucher_events (voucher_id, type, note)
  values (v.id, 'redeemed_walkin', r.name || ': bill ' || p_bill || ', credited ' || v_credited);

  return jsonb_build_object(
    'ok', true,
    'walk_in_id', w.id,
    'voucher_amount', v.amount,
    'bill_amount', w.bill_amount,
    'credited_amount', w.credited_amount,
    'forfeited_amount', w.forfeited_amount,
    'currency', v.currency,
    'customer_name', v.customer_full_name,
    'customer_email', v.customer_email,
    'customer_phone', v.customer_phone
  );
end;
$$;

revoke execute on function public.complete_walkin(text, text, uuid, numeric) from public, anon, authenticated;
grant execute on function public.complete_walkin(text, text, uuid, numeric) to service_role;
