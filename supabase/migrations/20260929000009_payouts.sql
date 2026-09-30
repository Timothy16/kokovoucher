-- Stage 6: money (mvp.md §5). Called only by the server (service role), except the view.

-- ---------- ledger view ----------
-- Each payout item with what earned it: the order (reference, dispute state) or the walk-in bill.
-- security_invoker: the caller's RLS applies to every joined table, so a restaurant sees only its
-- own lines and admin sees all.
create view public.payout_ledger
with (security_invoker = true) as
select
  pi.id,
  pi.restaurant_id,
  pi.source_type,
  pi.source_id,
  pi.amount,
  pi.currency,
  pi.status,
  pi.created_at,
  pi.revoked_at,
  pi.revoke_reason,
  pi.payout_id,
  o.reference as order_reference,
  o.dispute_status,
  w.bill_amount as walk_in_bill
from public.payout_items pi
left join public.orders o on pi.source_type = 'order' and o.id = pi.source_id
left join public.walk_ins w on pi.source_type = 'walk_in' and w.id = pi.source_id;

grant select on public.payout_ledger to authenticated;

-- ---------- process a payout ----------
-- Pays out exactly the restaurant's PENDING items, in one transaction:
--   * the restaurant row is locked, so payouts and currency edits for it can't interleave;
--   * the pending items are locked, so a revoke in flight waits and then finds them paid;
--   * the admin's on-screen total/count must still match (else STALE), so nothing added or
--     revoked since the page loaded is paid without being seen;
--   * items from orders with an OPEN dispute block the payout unless explicitly acknowledged.
create or replace function public.process_payout(
  p_restaurant_id uuid,
  p_expected_total numeric,
  p_expected_count integer,
  p_reference text,
  p_processed_by uuid,
  p_acknowledge_disputes boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.restaurants;
  v_ids uuid[];
  v_total numeric(14, 2);
  v_count integer;
  v_currencies integer;
  v_currency public.currency;
  v_disputed integer;
  p public.payouts;
begin
  select * into r from public.restaurants where id = p_restaurant_id for update;
  if r.id is null then
    return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;

  select array_agg(x.id), coalesce(sum(x.amount), 0), count(*), count(distinct x.currency), min(x.currency::text)::public.currency
  into v_ids, v_total, v_count, v_currencies, v_currency
  from (
    select id, amount, currency from public.payout_items
    where restaurant_id = r.id and status = 'pending'
    for update
  ) x;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'reason', 'NOTHING_PENDING');
  end if;
  if v_currencies > 1 then
    return jsonb_build_object('ok', false, 'reason', 'MIXED_CURRENCY');  -- guarded against upstream; never pay a mixed total
  end if;
  if v_total <> p_expected_total or v_count <> p_expected_count then
    return jsonb_build_object('ok', false, 'reason', 'STALE', 'total', v_total, 'count', v_count);
  end if;

  select count(*) into v_disputed
  from public.payout_items pi
  join public.orders o on pi.source_type = 'order' and o.id = pi.source_id
  where pi.id = any (v_ids) and o.dispute_status = 'open';
  if v_disputed > 0 and not coalesce(p_acknowledge_disputes, false) then
    return jsonb_build_object('ok', false, 'reason', 'DISPUTED_ITEMS', 'disputed', v_disputed);
  end if;

  insert into public.payouts (restaurant_id, total_amount, currency, item_count, reference, processed_by)
  values (r.id, v_total, v_currency, v_count, nullif(btrim(p_reference), ''), p_processed_by)
  returning * into p;

  update public.payout_items set status = 'paid', payout_id = p.id where id = any (v_ids);

  return jsonb_build_object(
    'ok', true,
    'payout_id', p.id,
    'total', p.total_amount,
    'currency', p.currency,
    'count', p.item_count,
    'reference', p.reference,
    'disputed_included', v_disputed,
    'restaurant_name', r.name,
    'restaurant_email', r.contact_email
  );
end;
$$;

revoke execute on function public.process_payout(uuid, numeric, integer, text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.process_payout(uuid, numeric, integer, text, uuid, boolean) to service_role;
