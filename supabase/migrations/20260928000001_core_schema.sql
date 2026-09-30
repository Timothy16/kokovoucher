-- KokoSend core schema (mvp.md §4, §5, §8).
-- Money is numeric(14,2). NGN/KES must be whole numbers; USD may carry cents.
-- Business-rule invariants that must survive races (single use, one active voucher
-- per secret key, one payout credit per source) are enforced here with unique indexes,
-- not only in application code.

create extension if not exists pgcrypto with schema extensions;

-- ---------- enums ----------
create type public.currency as enum ('NGN', 'KES', 'USD');
create type public.voucher_status as enum ('issued', 'reserved', 'redeemed', 'expired', 'void');
create type public.restaurant_status as enum ('invited', 'active', 'disabled');
create type public.order_status as enum ('placed', 'received', 'dispatched', 'delivered', 'cancelled', 'rejected');
create type public.payout_item_status as enum ('pending', 'paid', 'revoked');
create type public.redeem_method as enum ('delivery', 'walk_in');
create type public.payout_source_type as enum ('order', 'walk_in');
create type public.spice_level as enum ('spicy', 'non_spicy');
create type public.drop_option as enum ('door_drop', 'leave_at_gate');
create type public.dispute_status as enum ('open', 'resolved');
create type public.voucher_event_type as enum ('issued', 'reserved', 'released', 'redeemed_delivery', 'redeemed_walkin', 'expired', 'voided');
create type public.notification_channel as enum ('email', 'whatsapp');
create type public.notification_recipient_type as enum ('customer', 'restaurant', 'admin');
-- queued: written, not yet sent · sent: provider accepted · failed: provider error · skipped: channel not wired yet (WhatsApp)
create type public.notification_status as enum ('queued', 'sent', 'failed', 'skipped');

-- ---------- shared trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- settings (singleton row) ----------
create table public.settings (
  id boolean primary key default true check (id),
  admin_email text not null,
  voucher_validity_days integer not null default 7 check (voucher_validity_days between 1 and 90),
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (admin_email) values ('admin@rechargify.org');

-- ---------- restaurants ----------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  address text not null,
  logo_path text,                                   -- object path in the restaurant-logos bucket
  contact_person text not null,
  contact_number text not null,
  contact_email text not null,
  currency public.currency not null,
  status public.restaurant_status not null default 'invited',
  user_id uuid unique references auth.users (id) on delete set null,  -- set when the invite is accepted
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index restaurants_contact_email_key on public.restaurants (lower(contact_email));
create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

-- One live invite per restaurant. Resending revokes the old row and inserts a new one
-- (rule 21), so a leaked link stops working. Only the SHA-256 of the token is stored.
create table public.restaurant_invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  revoked_at timestamptz
);
create unique index restaurant_invites_one_live on public.restaurant_invites (restaurant_id)
  where used_at is null and revoked_at is null;

-- ---------- combos ----------
create table public.combos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  short_description text not null default '',
  description text not null default '',
  category text not null,
  image_path text not null,                         -- object path in the combo-images bucket (rule 23: required)
  available boolean not null default true,
  spice_option boolean not null default false,
  soda_options text[] not null default '{}',
  water_option boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index combos_restaurant_idx on public.combos (restaurant_id);
create trigger combos_updated_at before update on public.combos
  for each row execute function public.set_updated_at();

-- ---------- vouchers ----------
create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  customer_full_name text not null,
  customer_phone text not null,
  customer_email text not null,
  secret_key text not null check (length(btrim(secret_key)) > 0),   -- KokoSend username, as entered
  secret_key_normalized text generated always as (lower(btrim(secret_key))) stored,
  currency public.currency not null,
  amount numeric(14, 2) not null check (amount > 0),
  status public.voucher_status not null default 'issued',
  redeem_method public.redeem_method,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,                  -- 23:59:59 UTC on the last valid day
  redeemed_at timestamptz,
  verify_attempts integer not null default 0 check (verify_attempts >= 0),
  locked_at timestamptz,                            -- set when verify_attempts hits the limit (rule 18)
  void_reason text,
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (currency = 'USD' or amount = trunc(amount)),
  check (status <> 'redeemed' or (redeemed_at is not null and redeem_method is not null))
);
-- Rule 3: at most one ISSUED/RESERVED voucher per KokoSend username.
create unique index vouchers_one_active_per_key on public.vouchers (secret_key_normalized)
  where status in ('issued', 'reserved');
create index vouchers_status_idx on public.vouchers (status);
create index vouchers_created_idx on public.vouchers (created_at desc);
create index vouchers_expiry_idx on public.vouchers (expires_at) where status = 'issued';
create trigger vouchers_updated_at before update on public.vouchers
  for each row execute function public.set_updated_at();

create table public.voucher_events (
  id bigint generated always as identity primary key,
  voucher_id uuid not null references public.vouchers (id) on delete cascade,
  type public.voucher_event_type not null,
  at timestamptz not null default now(),
  note text
);
create index voucher_events_voucher_idx on public.voucher_events (voucher_id, at);

-- ---------- delivery orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^KV-[A-HJ-NP-Z2-9]{6}$'),
  voucher_id uuid not null references public.vouchers (id),
  combo_id uuid not null references public.combos (id),
  restaurant_id uuid not null references public.restaurants (id),
  status public.order_status not null default 'placed',
  spice_level public.spice_level,
  drink_choice text,
  delivery_name text not null,
  delivery_phone text not null,
  delivery_whatsapp text not null,
  house_name text not null,
  house_number text not null,
  floor text not null,
  landmark text,
  drop_option public.drop_option not null,
  additional_info text,
  dispute_status public.dispute_status,
  dispute_note text,
  dispute_reported_at timestamptz,
  dispute_resolution_note text,
  dispute_resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (dispute_status is null or dispute_reported_at is not null),
  check (dispute_status is distinct from 'resolved' or dispute_resolved_at is not null)
);
-- Rule 4: a voucher can back at most one live (non-cancelled/rejected) order.
create unique index orders_one_live_per_voucher on public.orders (voucher_id)
  where status not in ('cancelled', 'rejected');
create index orders_restaurant_idx on public.orders (restaurant_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_open_disputes_idx on public.orders (dispute_status) where dispute_status = 'open';
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  at timestamptz not null default now(),
  note text
);
create index order_status_history_order_idx on public.order_status_history (order_id, at);

-- ---------- walk-ins ----------
create table public.walk_ins (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null unique references public.vouchers (id),   -- rule 4: one walk-in per voucher
  restaurant_id uuid not null references public.restaurants (id),
  currency public.currency not null,
  bill_amount numeric(14, 2) not null check (bill_amount > 0),
  credited_amount numeric(14, 2) not null check (credited_amount > 0),   -- min(voucher, bill)
  forfeited_amount numeric(14, 2) not null check (forfeited_amount >= 0),
  created_at timestamptz not null default now(),
  check (credited_amount <= bill_amount),
  check (currency = 'USD' or bill_amount = trunc(bill_amount))
);
create index walk_ins_restaurant_idx on public.walk_ins (restaurant_id, created_at desc);

-- ---------- money (§5) ----------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id),
  total_amount numeric(14, 2) not null check (total_amount > 0),
  currency public.currency not null,
  item_count integer not null check (item_count > 0),
  reference text,
  processed_at timestamptz not null default now(),
  processed_by uuid references auth.users (id) on delete set null
);
create index payouts_restaurant_idx on public.payouts (restaurant_id, processed_at desc);

create table public.payout_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id),
  source_type public.payout_source_type not null,
  source_id uuid not null,                          -- orders.id or walk_ins.id
  amount numeric(14, 2) not null check (amount > 0),
  currency public.currency not null,
  status public.payout_item_status not null default 'pending',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  payout_id uuid references public.payouts (id),
  unique (source_type, source_id),                  -- never credit the same order/walk-in twice
  check ((status = 'paid') = (payout_id is not null)),
  check ((status = 'revoked') = (revoked_at is not null and revoke_reason is not null))
);
create index payout_items_restaurant_status_idx on public.payout_items (restaurant_id, status);

-- ---------- notifications (outbox + log, §6) ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  channel public.notification_channel not null,
  recipient_type public.notification_recipient_type not null,
  recipient text not null,
  template text not null,
  subject text not null,
  summary text not null,
  status public.notification_status not null default 'queued',
  provider_message_id text,
  error text,
  related_type text,                                -- e.g. 'voucher', 'order', 'restaurant'
  related_id uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_created_idx on public.notifications (created_at desc);
create index notifications_queued_idx on public.notifications (created_at) where status = 'queued';

-- ---------- audit log (rule 17) ----------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor text not null,                              -- 'admin' or the restaurant name for self-service actions
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,                             -- e.g. 'voucher.void', 'payout.process'
  target_type text not null,
  target_id text not null,
  note text,
  at timestamptz not null default now()
);
create index audit_log_at_idx on public.audit_log (at desc);
