-- Address autocomplete (MapTiler): street/area on orders, map locations on orders and restaurants.
-- A location is only present when the address was picked from the suggestions; a typed address
-- has none. Older rows simply have none.

alter table public.restaurants
  add column latitude double precision,
  add column longitude double precision,
  add constraint restaurants_location_pair check ((latitude is null) = (longitude is null)),
  add constraint restaurants_location_range check (latitude is null or (latitude between -90 and 90 and longitude between -180 and 180));

alter table public.orders
  add column street_address text,          -- required for new orders (server-side); null on orders placed before this change
  add column delivery_latitude double precision,
  add column delivery_longitude double precision,
  add constraint orders_location_pair check ((delivery_latitude is null) = (delivery_longitude is null)),
  add constraint orders_location_range check (delivery_latitude is null or (delivery_latitude between -90 and 90 and delivery_longitude between -180 and 180));

-- Public menu: add the restaurant's location so checkout can rank address suggestions nearest the
-- restaurant (the address itself is already public). New columns go at the end.
create or replace view public.public_menu as
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
  r.currency,
  r.latitude as restaurant_latitude,
  r.longitude as restaurant_longitude
from public.combos c
join public.restaurants r on r.id = c.restaurant_id
where c.available and r.status = 'active';

-- place_order gains the street/area and the delivery location. Replace the old signature so
-- there is exactly one version of the function.
drop function public.place_order(text, text, uuid, public.spice_level, text, text, text, text, text, text, text, text, public.drop_option, text);

create function public.place_order(
  p_code text,
  p_secret_key text,
  p_combo_id uuid,
  p_spice public.spice_level,
  p_drink text,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_whatsapp text,
  p_street_address text,
  p_latitude double precision,
  p_longitude double precision,
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
        delivery_name, delivery_phone, delivery_whatsapp, street_address, delivery_latitude, delivery_longitude,
        house_name, house_number, floor, landmark, drop_option, additional_info
      ) values (
        v_ref, v.id, c.id, r.id, v.amount, v.currency,
        case when c.spice_option then p_spice end,
        case when cardinality(v_drinks) > 0 then p_drink end,
        btrim(p_delivery_name), btrim(p_delivery_phone), btrim(p_delivery_whatsapp),
        btrim(p_street_address), p_latitude, p_longitude,
        btrim(p_house_name), btrim(p_house_number), btrim(p_floor),
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

revoke execute on function public.place_order(text, text, uuid, public.spice_level, text, text, text, text, text, double precision, double precision, text, text, text, text, public.drop_option, text) from public, anon, authenticated;
grant execute on function public.place_order(text, text, uuid, public.spice_level, text, text, text, text, text, double precision, double precision, text, text, text, text, public.drop_option, text) to service_role;
