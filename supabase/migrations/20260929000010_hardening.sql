-- Stage 7: expiry reminders + rate limiting. Called only by the server (service role).

-- ---------- expiry reminder (mvp.md §6, "voucher expiring") ----------
alter table public.vouchers add column reminder_sent_at timestamptz;

-- Atomically claims the vouchers that should get a reminder now: still ISSUED, expiring within
-- p_hours, never reminded. The claim is the UPDATE itself, so running the job twice (or two
-- instances at once) can never email the same customer twice.
create or replace function public.claim_expiry_reminders(p_hours integer)
returns setof public.vouchers
language sql
security definer
set search_path = ''
as $$
  update public.vouchers
  set reminder_sent_at = now()
  where status = 'issued'
    and reminder_sent_at is null
    and expires_at > now()
    and expires_at <= now() + make_interval(hours => p_hours)
  returning *
$$;

-- ---------- rate limiting ----------
-- Fixed-window counters shared by every server instance (in-memory limits don't work on
-- serverless). One row per key, e.g. 'track:203.0.113.7'.
create table public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  hits integer not null
);
alter table public.rate_limits enable row level security;  -- no policies: server-only
revoke all on public.rate_limits from anon, authenticated;

-- Counts one hit and returns whether it is within p_limit for the current window.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as rl (key, window_started_at, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
  set window_started_at = case when rl.window_started_at < now() - make_interval(secs => p_window_seconds) then now() else rl.window_started_at end,
      hits = case when rl.window_started_at < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- Old windows are useless after a day; keep the table small.
select cron.schedule('purge-rate-limits', '17 3 * * *', $$delete from public.rate_limits where window_started_at < now() - interval '1 day'$$);

revoke execute on function public.claim_expiry_reminders(integer) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_expiry_reminders(integer) to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
