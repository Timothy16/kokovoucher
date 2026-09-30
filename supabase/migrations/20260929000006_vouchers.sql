-- Stage 3: issuing and voiding vouchers. Called only by the server (service role).

-- ---------- issue (rules 2, 3, 19) ----------
-- One transaction: expire this username's stale vouchers (so cron lag never blocks a legitimate
-- reissue), enforce one active voucher per KokoSend username, generate a unique code, set the
-- expiry to 23:59:59 UTC on the last valid day (issue day = day 1), and record the event.
-- A double-submitted request can't create two vouchers: the second hits the rule-3 index.
create or replace function public.issue_voucher(
  p_full_name text,
  p_phone text,
  p_email text,
  p_secret_key text,
  p_currency public.currency,
  p_amount numeric,
  p_created_by uuid
)
returns public.vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O, 1/I
  v_key constant text := lower(btrim(p_secret_key));
  v_days integer;
  v_code text;
  v_voucher public.vouchers;
  v_attempt integer := 0;
  v_constraint text;
begin
  select voucher_validity_days into v_days from public.settings;

  with stale as (
    update public.vouchers
    set status = 'expired'
    where secret_key_normalized = v_key and status = 'issued' and expires_at < now()
    returning id
  )
  insert into public.voucher_events (voucher_id, type) select id, 'expired' from stale;

  if exists (select 1 from public.vouchers where secret_key_normalized = v_key and status in ('issued', 'reserved')) then
    raise exception 'ACTIVE_VOUCHER_EXISTS';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := '';
    for i in 1..8 loop
      -- 256 is a multiple of 32, so each character is uniformly random.
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32), 1);
      if i = 4 then v_code := v_code || '-'; end if;
    end loop;

    begin
      insert into public.vouchers (code, customer_full_name, customer_phone, customer_email, secret_key, currency, amount, expires_at, created_by)
      values (
        v_code,
        btrim(p_full_name),
        btrim(p_phone),
        lower(btrim(p_email)),
        btrim(p_secret_key),
        p_currency,
        p_amount,
        ((now() at time zone 'UTC')::date + v_days)::timestamp at time zone 'UTC' - interval '1 second',
        p_created_by
      )
      returning * into v_voucher;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'vouchers_one_active_per_key' then
        raise exception 'ACTIVE_VOUCHER_EXISTS';
      end if;
      if v_attempt >= 5 then raise; end if;  -- code collision 5 times in a row: give up
    end;
  end loop;

  insert into public.voucher_events (voucher_id, type) values (v_voucher.id, 'issued');
  return v_voucher;
end;
$$;

-- ---------- void ----------
-- Only an untouched ISSUED voucher that is still inside its window can be voided. A reserved
-- one backs a live order (cancel the order instead); an expired one is already unusable.
create or replace function public.void_voucher(p_voucher_id uuid, p_reason text)
returns public.vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voucher public.vouchers;
  v_reason constant text := nullif(btrim(p_reason), '');
begin
  update public.vouchers
  set status = 'void', void_reason = v_reason
  where id = p_voucher_id and status = 'issued' and expires_at >= now()
  returning * into v_voucher;

  if v_voucher.id is null then
    raise exception 'NOT_VOIDABLE';
  end if;

  insert into public.voucher_events (voucher_id, type, note) values (p_voucher_id, 'voided', v_reason);
  return v_voucher;
end;
$$;

revoke execute on function public.issue_voucher(text, text, text, text, public.currency, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.void_voucher(uuid, text) from public, anon, authenticated;
grant execute on function public.issue_voucher(text, text, text, text, public.currency, numeric, uuid) to service_role;
grant execute on function public.void_voucher(uuid, text) to service_role;
