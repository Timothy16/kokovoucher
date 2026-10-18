# KokoSend: notes for coding agents

Read `README.md` first, especially **Current status**, **Working on this codebase** and the
**Decisions** table. `mvp.md` is the product spec (business rules are referenced as "rule N").

## Rules that must not be broken

- The browser only **reads** (Supabase + RLS). Every **write** goes through a server route in
  `server/api/` that checks the caller (`requireUser` / `requireRestaurant`), validates with zod
  (`parseBody`) and changes data through one Postgres function or one conditional update.
- Business invariants live in the database (unique indexes, triggers, `security definer`
  functions). Don't re-implement them only in TypeScript.
- Schema changes are new files in `supabase/migrations/`; never edit an applied migration. Then
  `npm run db:push` and `npm run db:types`.
- Every outbound message goes through `notifyEmail` / `notifyWhatsapp` (logged first, then sent).
  WhatsApp only through Meta-approved templates in `server/utils/whatsapp-templates.ts`.
- Sensitive admin actions call `audit()`. Never put secrets (tokens, keys) in logs or notification
  summaries.
- Phone numbers: use `PhoneInput` in the UI and `internationalPhone()` in server schemas; store
  E.164 (`+2348030000001`). Never accept a number without its country code.
- Addresses: use `AddressInput` (MapTiler suggestions) and `geoPoint` in server schemas. A picked
  suggestion saves a location; a typed address must still be accepted (no location).
- User-facing name is **KokoSend** (not KokoVoucher). Money: USD may have cents; NGN/KES are whole
  numbers. Voucher expiry is defined in UTC.

## Before calling a change done

- `npx nuxt typecheck` → 0 errors, and `npx nuxt build` succeeds.
- Test against the demo Supabase project with real recipients you control (email and WhatsApp are
  live through Infobip), then delete the test data you created.
- Update `README.md`: the **Current status** section and the relevant stage notes.

## Don't

- Commit `.env` or paste secrets into chat or files.
- Use `statusMessage` in `createError` (use `message`).
- Add a mock or in-memory data layer; the app runs on Supabase only.
