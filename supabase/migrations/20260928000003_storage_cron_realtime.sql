-- ---------- storage: combo photos + restaurant logos ----------
-- Public read (they appear on the public menu). Only admin may upload/replace/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('combo-images', 'combo-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('restaurant-logos', 'restaurant-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admin uploads menu images" on storage.objects for insert to authenticated
  with check (bucket_id in ('combo-images', 'restaurant-logos') and public.is_admin());
create policy "admin updates menu images" on storage.objects for update to authenticated
  using (bucket_id in ('combo-images', 'restaurant-logos') and public.is_admin());
create policy "admin deletes menu images" on storage.objects for delete to authenticated
  using (bucket_id in ('combo-images', 'restaurant-logos') and public.is_admin());

-- ---------- voucher expiry ----------
-- Flips ISSUED vouchers past their window to EXPIRED and records the event.
-- RESERVED vouchers are left alone on purpose: they always back a live order, and
-- expiring one mid-delivery would strand that order. When such an order is cancelled
-- or rejected, the release path checks expiry and expires the voucher then.
create or replace function public.expire_vouchers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  with expired as (
    update public.vouchers v
    set status = 'expired'
    where v.status = 'issued' and v.expires_at < now()
    returning v.id
  ),
  logged as (
    insert into public.voucher_events (voucher_id, type)
    select id, 'expired' from expired
    returning 1
  )
  select count(*) into n from logged;
  return n;
end;
$$;

revoke execute on function public.expire_vouchers() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule('expire-vouchers', '*/5 * * * *', $$select public.expire_vouchers()$$);

-- ---------- realtime: restaurant order inbox ----------
-- RLS still applies to realtime, so a restaurant only receives its own orders.
alter publication supabase_realtime add table public.orders;
