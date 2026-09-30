-- Access model:
--   * The browser only READS, through Row Level Security.
--   * Every WRITE goes through a Nuxt server route (/api/*) using the service role,
--     which checks the caller's role and calls transactional SQL functions.
--   * Customers are anonymous: they can read the public_menu view and nothing else.
-- Roles come from auth.users.app_metadata.role ('admin' | 'restaurant'), which users
-- cannot edit themselves.

-- ---------- role helpers ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- The caller's restaurant, only while it is ACTIVE. Disabling a restaurant therefore cuts
-- off its data access immediately, without waiting for its JWT to expire.
-- security definer so policies on restaurants can call it without recursing into RLS.
create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.id from public.restaurants r
  where r.user_id = auth.uid() and r.status = 'active'
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.current_restaurant_id() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.current_restaurant_id() to authenticated, service_role;

-- ---------- lock down direct writes from the browser ----------
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke usage, select on all sequences in schema public from anon, authenticated;

-- ---------- enable RLS everywhere ----------
alter table public.settings enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_invites enable row level security;
alter table public.combos enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_events enable row level security;
alter table public.orders enable row level security;
alter table public.order_status_history enable row level security;
alter table public.walk_ins enable row level security;
alter table public.payouts enable row level security;
alter table public.payout_items enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- ---------- admin: read everything ----------
create policy "admin reads settings" on public.settings for select to authenticated using (public.is_admin());
create policy "admin reads restaurants" on public.restaurants for select to authenticated using (public.is_admin());
create policy "admin reads invites" on public.restaurant_invites for select to authenticated using (public.is_admin());
create policy "admin reads combos" on public.combos for select to authenticated using (public.is_admin());
create policy "admin reads vouchers" on public.vouchers for select to authenticated using (public.is_admin());
create policy "admin reads voucher events" on public.voucher_events for select to authenticated using (public.is_admin());
create policy "admin reads orders" on public.orders for select to authenticated using (public.is_admin());
create policy "admin reads order history" on public.order_status_history for select to authenticated using (public.is_admin());
create policy "admin reads walk-ins" on public.walk_ins for select to authenticated using (public.is_admin());
create policy "admin reads payouts" on public.payouts for select to authenticated using (public.is_admin());
create policy "admin reads payout items" on public.payout_items for select to authenticated using (public.is_admin());
create policy "admin reads notifications" on public.notifications for select to authenticated using (public.is_admin());
create policy "admin reads audit log" on public.audit_log for select to authenticated using (public.is_admin());

-- ---------- restaurant: read its own rows ----------
-- Own profile row is readable even when disabled, so the app can show the disabled notice.
create policy "restaurant reads own profile" on public.restaurants for select to authenticated
  using (user_id = auth.uid());
create policy "restaurant reads own combos" on public.combos for select to authenticated
  using (restaurant_id = public.current_restaurant_id());
create policy "restaurant reads own orders" on public.orders for select to authenticated
  using (restaurant_id = public.current_restaurant_id());
create policy "restaurant reads own order history" on public.order_status_history for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_status_history.order_id and o.restaurant_id = public.current_restaurant_id()
  ));
create policy "restaurant reads own walk-ins" on public.walk_ins for select to authenticated
  using (restaurant_id = public.current_restaurant_id());
create policy "restaurant reads own payouts" on public.payouts for select to authenticated
  using (restaurant_id = public.current_restaurant_id());
create policy "restaurant reads own payout items" on public.payout_items for select to authenticated
  using (restaurant_id = public.current_restaurant_id());

-- ---------- views ----------
-- Public menu for anonymous customers: available combos from active restaurants, safe columns only
-- (no restaurant contact details). Runs with the owner's rights on purpose, so anon needs no
-- table-level access at all.
create view public.public_menu as
select
  c.id,
  c.restaurant_id,
  c.name,
  c.short_description,
  c.description,
  c.category,
  c.image_path,
  c.spice_option,
  c.soda_options,
  c.water_option,
  c.created_at,
  r.name as restaurant_name,
  r.address as restaurant_address,
  r.logo_path as restaurant_logo_path,
  r.currency
from public.combos c
join public.restaurants r on r.id = c.restaurant_id
where c.available and r.status = 'active';

grant select on public.public_menu to anon, authenticated;

-- Wallet balance is derived, never stored (§5): the sum of PENDING payout items.
create view public.restaurant_wallets
with (security_invoker = true) as
select
  pi.restaurant_id,
  pi.currency,
  sum(pi.amount) as pending_balance,
  count(*) as pending_count
from public.payout_items pi
where pi.status = 'pending'
group by pi.restaurant_id, pi.currency;

grant select on public.restaurant_wallets to authenticated;
