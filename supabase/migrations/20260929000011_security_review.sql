-- Stage 7 security review (Supabase advisor).
-- current_restaurant_id() is only needed by signed-in users (RLS policies call it). Anonymous
-- callers got nothing from it, but they have no reason to call it at all.
revoke execute on function public.current_restaurant_id() from anon;

-- Intentional, reviewed and kept:
--  * public.public_menu runs with its owner's rights on purpose: it exposes only safe columns
--    (no contact details) of available combos at active restaurants. Making it security_invoker
--    would require granting anon/authenticated SELECT on restaurants, which would expose other
--    restaurants' contact details to signed-in restaurant users.
--  * public.rate_limits has RLS enabled with no policies: server-only by design.
