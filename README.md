# KokoSend

Fixed-value restaurant food vouchers. Admin issues a voucher to a customer (identified by their
**KokoSend username**, used as a secret key). The customer spends it once — by **delivery** from
the partner menu, or by **walking into** any partner restaurant. Restaurants are credited in a
wallet and paid out by admin.

- **Product spec (source of truth):** [`mvp.md`](./mvp.md) — business rules, lifecycles, screens.
- **This file:** how it's built, how to run it, and where each build stage stands.
- **Picking this up?** Read [Current status](#current-status) and
  [Working on this codebase](#working-on-this-codebase) first.

---

## Current status

*Last updated 2026-10-13.*

**Done:** the whole MVP in `mvp.md` runs on Supabase (Stages 0–7 below), plus email and WhatsApp
through Infobip. There is no mock data left.

**Environments:** one Supabase project, **demo** (`wntedncojkxjtwvcecav`, eu-west-1), used for local
development and testing. A separate **live** project will be created only when testing is finished;
the plan is in [Going live later](#going-live-later). There is no seed data; the only account is the
admin (`admin@kokosend.com`).

**Open items, roughly in order:**
1. **WhatsApp end-to-end test with a real number.** Email is verified: on 2026-10-13 a voucher
   email went through the app to a real inbox and Infobip reported it *delivered* (after the
   Infobip trial was ended; trial accounts only deliver to whitelisted recipients). WhatsApp logic
   is unit-tested but no real WhatsApp has been sent through the app yet.
   Note: the notification log's *sent* means "accepted by Infobip", not "delivered" — there is no
   delivery-report webhook yet.
2. **Supabase password-reset email still uses Resend SMTP.** To move it to Infobip, see
   [Supabase Auth emails](#supabase-auth-emails-password-reset).
3. **Turn off public sign-ups** in Supabase (Authentication → Sign In / Providers). The app creates
   every account itself, so sign-ups only let strangers create empty accounts and trigger emails.
4. **WhatsApp templates still missing** for the walk-in receipt (rule 11) and voucher cancelled.
   Those go by email only until new templates are approved.
5. **Before real customers:** real Terms and Privacy text (pages are placeholders), Supabase
   leaked-password protection, the live project, own domain, and restrict the MapTiler key to the
   production domain.

---

## Stack

| Layer | Choice |
|---|---|
| App | Nuxt 4 (Vue 3), client-rendered (`ssr: false`), Tailwind |
| Server | Nuxt server routes (`server/api/*`), deployed on **Vercel** |
| Database / Auth / Storage | **Supabase** (Postgres + RLS, Auth, Storage, Realtime, pg_cron) |
| Email | **Infobip** from `no-reply@voucher.kokosend.com` (app emails). Supabase Auth's password-reset email still goes through Resend SMTP (dashboard setting) |
| WhatsApp | **Infobip**, using Meta-approved templates (`server/utils/whatsapp-templates.ts`) |

## How the system is put together

```
Browser ──reads (RLS)──────────────▶ Supabase Postgres
   │
   └──writes: useApi() + JWT ──▶ /api/* (Nuxt server) ──service role──▶ Postgres functions / tables
                                        ├─▶ Infobip (email + WhatsApp)
                                        └─▶ audit_log + notifications
```

**Rules that hold everywhere:**

1. **The browser only reads.** Row Level Security decides what each user sees. Anonymous customers
   can read only the `public_menu` view (no restaurant contact details).
2. **Every write goes through a server route**, which checks the caller (`requireUser(event, 'admin')`)
   and validates input with zod. Browsers have no insert/update/delete rights on any table.
3. **Business invariants live in the database**, so no code path can skip them:
   - one active voucher per KokoSend username (unique index)
   - one live order *or* walk-in per voucher (unique indexes)
   - an order/walk-in can only ever be credited once (unique payout source)
   - a restaurant's currency can't change while money is owed or orders are in flight (trigger)
   - multi-step state changes (disable restaurant, release voucher, …) are single SQL transactions
4. **Roles** come from `auth.users.app_metadata.role` (`admin` | `restaurant`) — users can't edit it.
   A restaurant's data access requires its row to be `active`, so disabling cuts access instantly.
5. **Every notification is logged first, then sent**, and its row records `sent` / `failed` /
   `skipped`. A failed email never fails the action that triggered it. Logs never contain secrets.
6. **Every sensitive action is written to `audit_log`.**

### Decisions (beyond `mvp.md`)

| Topic | Decision |
|---|---|
| Voucher expiry | 23:59:59 **UTC** on day 7 (server time); shown in the viewer's local time |
| Expiry job | pg_cron every 5 min expires `issued` vouchers. `reserved` ones (backing a live order) are not expired mid-delivery; if that order is cancelled/rejected, the voucher expires then |
| Disabling a restaurant | Cancels placed, received **and dispatched** orders; vouchers released; customers notified; login banned |
| Currency change | Blocked while a payout is pending **or** delivery orders are in flight |
| Disputes | Open → resolved (with a note) by admin |
| Walk-in QR scanner | Removed — codes are typed |
| Restaurant invites | Token stored hashed, single use, expires after 7 days, resending revokes the old link |
| Passwords | Min 8 characters; forgot-password via Supabase Auth (its SMTP is still Resend) |
| Amounts | USD may have cents; NGN/KES are whole numbers (DB check constraint) |
| Addresses | MapTiler suggestions (`AddressInput`) on the checkout street / area and the restaurant address. Picked → map location saved + Open in Maps; typed → accepted without a location. Called from the browser with `NUXT_PUBLIC_MAPTILER_API_KEY` (restrict it to our domains in MapTiler) |
| Phone numbers | Entered with a country picker (`PhoneInput`), stored in international E.164 form (`+2348030000001`), validated with libphonenumber-js in the app and on the server (`internationalPhone`) |
| Seed data | None — the database starts empty except for the admin account |
| Brand | The product is **KokoSend** (renamed from KokoVoucher). Internal identifiers (package name, storage keys, repo folder) keep the old name |
| Emails | One design system (`server/utils/email.ts`), all wording in `server/utils/email-templates.ts`. Replies go to the admin email from Settings. Voucher codes never appear in the inbox preview text |

---

## Project layout

```
app/
  composables/useSupabase.ts   browser Supabase client (read-only), image upload helpers
  composables/useAuth.ts       who is signed in; role; the signed-in restaurant's row
  composables/useApi.ts        calls /api/* with the user's token; apiErrorMessage()
  middleware/                  admin-auth, restaurant-auth
  pages/                       admin/*, restaurant/*, customer pages
server/
  api/                         server routes (the only writers)
  utils/                       supabase (service client, requireUser), http (parseBody, fail),
                               notify (log + send), email (design system), email-templates, infobip,
                               whatsapp-templates,
                               audit, tokens, rate-limit, restaurants, combos, vouchers, orders
shared/types/
  database.types.ts            GENERATED from the live schema — `npm run db:types`
  models.ts                    friendly aliases + shared constants
shared/utils/                  formatCurrency, voucher status, order + payout helpers (app AND server)
supabase/migrations/           the schema, in order — applied with `npm run db:push`
```

## Running locally

1. `npm install`
2. Copy `.env.example` → `.env` and fill it in (see comments in the file). **Never commit `.env`.**
3. `npm run dev` → http://localhost:3000

### Database changes

Schema lives in `supabase/migrations/` (one file per change, never edit an applied file):

```bash
# SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD must be in the environment
npm run db:push     # apply new migrations to the Supabase project
npm run db:types    # regenerate shared/types/database.types.ts
```

### One-time Supabase dashboard settings

- **Authentication → Emails → SMTP:** currently Resend (`smtp.resend.com`, port 465, user `resend`,
  sender `no-reply@rechargify.org`). To move it to Infobip, see
  [Supabase Auth emails](#supabase-auth-emails-password-reset)
- **Authentication → URL Configuration:** Site URL = the app URL; add
  `http://localhost:3000/restaurant/reset-password` (and the production equivalent) to **Redirect URLs**
- **Admin account:** created via the Auth admin API with `app_metadata: { "role": "admin" }` ✅ done (`admin@kokosend.com`)

### Deploying (Vercel)

See **[Deploying to Vercel](#deploying-to-vercel)** at the end of this file.

### Supabase Auth emails (password reset)

Supabase sends the restaurant password-reset email itself, using the SMTP server set in the
dashboard (the app's own emails go through the Infobip API, not SMTP). To send it through Infobip
too, set **Authentication → Emails → SMTP Settings**:

| Field | Value |
|---|---|
| Host | `smtp-api.infobip.com` |
| Port | `587` (or `465`) |
| Username | `App` (literally the word App) |
| Password | the Infobip API key (`NUXT_INFOBIP_API_KEY`) |
| Sender email | `no-reply@voucher.kokosend.com` |
| Sender name | `KokoSend` |

The branded reset template (Authentication → Emails → Templates → Reset password) doesn't change.
After switching, test with "Forgot password?" on `/restaurant/login`.

**The reset link only returns to the reset page if both of these match the real domain:**
`NUXT_PUBLIC_SITE_URL` in Vercel (the app asks Supabase to return to
`<NUXT_PUBLIC_SITE_URL>/restaurant/reset-password`), and that exact address under Supabase →
Authentication → URL Configuration → **Redirect URLs**. If they don't match, Supabase falls back to
the Site URL (home page). `app/plugins/auth-landing.client.ts` catches that case and forwards the
link to the reset page, so users aren't stranded, but fix the settings anyway. Also consider turning
off Infobip **click tracking** for `voucher.kokosend.com`: it rewrites every link through
`tracking.….voucher.kokosend.com`, including reset and invite links that carry one-time secrets.

### Going live later

1. New Supabase project (Pro plan: free projects pause after a week of inactivity and have no
   backups). Then `npx supabase link --project-ref <live-ref>` and `npx supabase db push` apply all
   migrations. Link back to demo afterwards (`npm run db:link`).
2. Redo the dashboard settings, which are not in migrations: SMTP, Site URL + redirect URL,
   password-reset template + subject + sender name, sign-ups off, leaked-password protection.
3. Create the live admin with the Auth admin API (`app_metadata: { "role": "admin" }`).
4. In Vercel, give **Production** the live project's variables and **Preview** the demo's.
5. From then on, apply every new migration to demo first, test, then to live.

---

## Working on this codebase

### The pattern every feature follows

- **Reads** happen in the browser with `useSupabase()` (RLS decides what each user sees), usually
  inside `useAsyncData`. Pages show `LoadingState`, `ErrorState` (with retry) and `EmptyState`, and
  work at phone width.
- **Writes** go through a server route called with `useApi()`. A route:
  1. checks the caller: `requireUser(event, 'admin')`, `requireRestaurant(event)` (must be active),
     or nothing for public routes, which get `rateLimit(event, ...)` instead;
  2. validates input with zod via `parseBody(event, schema)`;
  3. changes data through one Postgres function (`db.rpc(...)`) or one conditional update, so the
     rule and the change happen atomically;
  4. sends messages with `notifyEmail` / `notifyWhatsapp` and records sensitive actions with `audit`.
- **Errors:** throw with `fail(status, message)` (or `createError({ message })`, never
  `statusMessage`). The client shows `apiErrorMessage(e)`. Database functions *return*
  `{ ok: false, reason }` instead of raising when the attempt itself must be recorded (wrong
  voucher keys); `refuse()` in `server/utils/orders.ts` maps those reasons to messages.

### Recipes

- **New database rule or table:** add a new file in `supabase/migrations/` (never edit an applied
  one). Server-only functions are `security definer`, `set search_path = ''`, with
  `revoke execute … from public, anon, authenticated` and `grant execute … to service_role`. New
  tables get RLS enabled. Then `npm run db:push` and `npm run db:types`.
- **New email:** add a function in `server/utils/email-templates.ts` built from the blocks in
  `server/utils/email.ts`. It returns a subject, a log summary (no secrets) and the content.
- **New WhatsApp message:** Meta must approve every template first. Add it to `WHATSAPP_TEMPLATES`
  in `server/utils/whatsapp-templates.ts`, submit it from `/admin/infobip-test`, wait for approval,
  then add a builder to `whatsapp` and pass it to `notifyWhatsapp`. Approved wording can't be edited;
  a change means a new template name.
- **Shared helpers:** anything in `shared/utils/` is auto-imported in both the app and the server.
  Types and constants in `shared/types/models.ts` must be imported explicitly.

### Testing

There is no test suite in the repo. Each stage was verified with throwaway Node scripts run against
a local `npm run dev` and the demo project: they created temporary admins, restaurants and vouchers
through the real API, checked results (including 401/403s, race conditions and RLS from each role),
then deleted everything they created. If you do the same:
- **Email and WhatsApp are real now.** Use addresses and numbers you control; fake recipients
  waste sends and hurt the domain's reputation.
- **Rate limits** are per IP, so many requests from one machine get 429s. Locally the server trusts
  the `x-real-ip` header, so give test requests different values. (Vercel sets that header itself
  in production, so it can't be spoofed there.)
- **Clean up** test rows afterwards: notifications, audit log, payout items, payouts, walk-ins,
  orders, vouchers, restaurants, storage images, auth users.
- Run `npx nuxt typecheck` (expected: 0 errors) and `npx nuxt build` before calling a change done.

### Gotchas

- `shared/types/database.types.ts` is generated from the live schema. Regenerate it after every
  migration, and never edit it by hand. Views report every column as nullable (see `MenuItem` in
  `models.ts` for how that's handled).
- `.env` values may be wrapped in quotes. Nuxt handles that; shell scripts that read `.env` must
  strip them.
- Stopping `nuxt dev` from some tools leaves the Node process holding port 3000. Free the port
  before starting it again.
- `useMockDb` and Resend are gone. Ignore any mention of them in old commits or notes.

---

## Build stages

Each stage replaced one area of the original mock layer end to end (database → server → pages),
was tested against the live project, and left the build green. The mock layer is gone: every page
now runs on Supabase.

| # | Stage | Status |
|---|---|---|
| 0 | Foundation — schema, RLS, storage, cron, realtime, clients, env | ✅ Done |
| 1 | Auth + restaurants | ✅ Done |
| 2 | Menu (combos, photos, availability, public menu) | ✅ Done |
| 3 | Vouchers + email (issue, void, resend, lockout, notification log) | ✅ Done |
| 4 | Delivery (checkout, order lifecycle, restaurant inbox, tracking, disputes) | ✅ Done |
| 5 | Walk-in redemption | ✅ Done |
| 6 | Money (wallet, payout items, process payout, revoke) | ✅ Done |
| 7 | Admin views + hardening (dashboard, audit log, settings, expiry reminder, rate limits, security review) | ✅ Done |

### ✅ Stage 0 — Foundation
- 13 tables, 2 views (`public_menu`, `restaurant_wallets`), enums, indexes, invariants (migrations 001–003)
- RLS: admin reads all; restaurant reads own rows while active; anon reads `public_menu` only
- Storage buckets `combo-images`, `restaurant-logos` (public read, admin-only write, 2MB, JPG/PNG/WebP)
- pg_cron `expire-vouchers` every 5 minutes; Realtime on `orders`
- Browser + server Supabase clients, Resend transport, `.env.example`

### ✅ Stage 1 — Auth + restaurants
- **Admin:** login/logout (Supabase Auth, role-checked); restaurants list, create (logo upload,
  invite email + copyable link), detail, edit (currency guard), resend invite (rotates link),
  disable (releases in-flight orders, bans login) / re-enable
- **Restaurant:** accept invite (set password → active → signed in), login, disabled notice,
  forgot password + reset link, change password (re-checks current password), profile view
- **Server routes:** `POST /api/admin/restaurants`, `PATCH /api/admin/restaurants/:id`,
  `POST …/:id/resend-invite`, `POST …/:id/disable`, `POST …/:id/enable`,
  `GET /api/invites/:token`, `POST /api/invites/accept`
- **Database:** migration 005 — `disable_restaurant()`, `release_voucher()` (reused by Stage 4),
  currency guard trigger, `auth_email_in_use()`
- **Verified live:** 30 end-to-end checks (authz 401/403, validation, duplicate emails, token
  rotation, single-use accept, RLS isolation, currency guard, disable/ban/enable, audit + email log)
- **Still mock (by design, until their stage):** restaurant dashboard/orders/walk-in/wallet *data*
  (they already use the real signed-in restaurant) and the admin dashboard other than the
  "invited restaurants" card (Stage 7)

### ✅ Stage 2 — Menu
- **Admin:** menu manager per restaurant (photo cards, availability toggle), Add combo / Edit combo
  pages sharing `ComboForm` — required photo uploaded to Storage, category from a fixed list,
  spice choice, soda list (unique, max 10, "Water" reserved for its own toggle), water toggle
- **Restaurant:** own menu with availability toggle (rule 13)
- **Customer:** `/menu` (filter by restaurant/category/currency, `?currency=` preset) and
  `/menu/:id` read the `public_menu` view — only available combos of active restaurants
- **Server routes:** `POST /api/admin/restaurants/:id/combos`, `PATCH /api/admin/combos/:id`,
  `PATCH /api/combos/:id/availability` (admin: any combo; restaurant: own combo, only while active)
- Replaced photos are deleted from Storage; an upload whose save fails is discarded
- No migration needed — combos, bucket, view and RLS were created in Stage 0
- **Verified live:** 29 end-to-end checks (upload rights, validation, 401/403/404 authz, RLS
  isolation between restaurants, public-menu visibility on unavailable/disabled, photo cleanup,
  audit log)
- The Stage 2 checkout gap ("Combo not found") was closed in Stage 4.

### ✅ Stage 3 — Vouchers + email
- **Database (migration 006):** `issue_voucher()` — expires the username's stale vouchers, enforces
  one active voucher per username, generates a unique `XXXX-XXXX` code (no 0/O/1/I), expiry
  23:59:59 UTC at the end of day N (N from Settings), records the event. `void_voucher()` — only an
  unused, unexpired voucher, with an optional reason
- **Server routes:** `POST /api/admin/vouchers`, `POST …/:id/void`, `POST …/:id/resend`
- **Admin pages:** generate (confirm dialog, can't double-submit), vouchers list (status /
  currency / day filters, lock indicator, resend, void), voucher detail (audit trail, attempts,
  linked order / walk-in), notification log (real rows with sent / failed / skipped status)
- **Email design system:** branded layout with blocks (voucher "ticket", details, numbered steps,
  callouts, full-width button + link fallback), inbox preheader, plain-text twin, phone layout,
  Reply-To = admin email. Templates: voucher issued / resent, voucher cancelled, restaurant
  invite, order cancelled, and the Supabase password-reset email (uploaded to Auth settings)
- **Verified live:** 27 end-to-end checks (validation, 401, one-voucher-per-username incl. case
  and spaces, concurrent double submit → exactly one voucher, USD cents, UTC day-7 expiry,
  resend/void rules, stale-voucher reissue, expiry job, email sent + WhatsApp skipped, audit log)

### ✅ Stage 4 — Delivery
- **Database (migration 007):** orders now store `amount` + `currency` (snapshot of the voucher);
  `check_voucher_credentials()` (shared with Stage 5): normalises the code (`af7k9qx2` works),
  counts wrong keys and locks at 5, gives one identical answer for wrong code / wrong key, and only
  reveals void / used / held / expired once the key is right. `place_order()` (credentials last,
  combo + restaurant + currency + spice/drink checks, unique `KV-XXXXXX` reference, voucher
  reserved, all in one transaction). `advance_order()` (placed → received → dispatched → delivered,
  or reject from placed/received; delivered = voucher redeemed + pending payout item; rejected =
  voucher released). `report_order_problem()`
- **Server routes:** `POST /api/orders` (public checkout), `POST /api/orders/track`,
  `POST /api/orders/report`, `PATCH /api/restaurant/orders/:id`, `POST /api/admin/orders/:id/resolve`
- **Customer:** checkout reads the real menu; spice → drink → delivery → voucher last; currency
  mismatch links to matching restaurants. Tracking page (emails link with `?ref=`), timeline,
  "voucher active again" after reject/cancel, report a problem
- **Restaurant:** live inbox (Supabase Realtime, RLS-scoped) with a new-order count in the
  sidebar and a toast; order detail with accept → dispatch → deliver (confirm step) or reject with
  a reason; dashboard shows real orders and wallet balance
- **Admin:** orders list (status / restaurant / dispute filters), order detail with history,
  voucher link, payout-item state and **resolve dispute**; dashboard dispute card is live
- **Emails:** order confirmed (customer), new order (restaurant, admin), preparing / on its way /
  delivered with "report a problem" (customer), order not completed (reject or disabled
  restaurant), dispute reported (admin). WhatsApp twins logged as skipped
- **Verified live:** 48 end-to-end checks + a Realtime check (restaurant gets its new order live;
  another restaurant does not, even when it subscribes to that id)
- **Decision:** wrong-attempt messages don't show a remaining count (a count would reveal that the
  code exists); the message says the voucher locks after 5 wrong tries

### ✅ Stage 5 — Walk-in
- **Database (migration 008):** `complete_walkin()` re-checks code + secret key (same
  `check_voucher_credentials()` as checkout, so wrong keys count toward the lockout), requires an
  active restaurant and matching currency, credits `min(voucher, bill)`, records the forfeited
  remainder, writes the walk-in + pending payout item and redeems the voucher, all in one transaction
- **Server routes:** `POST /api/restaurant/walk-ins/verify` (step 1: value + customer first name
  only), `POST /api/restaurant/walk-ins` (step 2: redeem against the bill)
- **Restaurant page:** check voucher → enter bill with a live preview (credited / customer pays the
  rest / forfeited) → receipt. Built for a phone at the till
- **Customer safety alert (rule 11):** receipt email on every walk-in with "wasn't you? reply to
  this email" (replies reach the admin inbox); WhatsApp twin logged as skipped
- **Admin:** walk-ins list (restaurant filter, bill / credited / forfeited)
- **Removed:** QR scanner, the unused v1 `QrCode` and `CountdownBadge` components, and the
  `jsqr` / `qrcode` packages. `@types/node` is now a direct dev dependency (it had only been pulled
  in by `@types/qrcode`)
- **Verified live:** 26 end-to-end checks (authz, wrong key counted, currency mismatch, bill below /
  above the voucher, USD cents, NGN whole-number bills, no double redemption, two tills at once,
  voucher held by a delivery order, RLS, wallet, disabled restaurant)

### ✅ Stage 6 — Money
- **Database (migration 009):** `payout_ledger` view (each credit with its order reference +
  dispute state or walk-in bill; `security_invoker`, so RLS still applies). `process_payout()`:
  locks the restaurant and its pending credits, refuses if the admin's on-screen total/count no
  longer matches (**STALE**), refuses open-dispute credits unless explicitly acknowledged, refuses a
  mixed-currency balance, then writes the payout record and marks exactly those credits paid
- **Server routes:** `POST /api/admin/restaurants/:id/payout`,
  `POST /api/admin/payout-items/:id/revoke` (pending only, reason required; a single conditional
  update, so it can't revoke something a payout is taking)
- **Admin payouts page:** per-restaurant pending balance (the database's own sum, exact for USD
  cents), credit lines linked to their orders, disputed lines highlighted, "pay anyway"
  acknowledgement, optional payment reference, revoke with reason, payout history
- **Restaurant wallet:** pending balance, every credit (pending / paid / revoked with the reason,
  "customer reported a problem" flag), payout history
- **Emails:** payout sent, credit revoked (restaurant; replies reach admin)
- **Verified live:** 29 end-to-end checks incl. STALE totals, dispute block + acknowledged pay,
  revoke rules, exact USD cents, a credit arriving after page load, and two races (payout vs revoke,
  payout vs payout) each resolving to exactly one winner with consistent state

### ✅ Stage 7 — Admin views + hardening
- **Admin dashboard** on real data: issued / redeemed / expired today (admin's local day), vouchers
  in delivery now, open disputes, restaurants awaiting their invite, pending payouts per currency,
  recent vouchers. **Audit log** page (filter by area, links to the voucher / restaurant / order).
  **Settings** page (admin email, validity days) via `PATCH /api/admin/settings`, audit-logged
- **Expiry reminder:** `GET /api/cron/expiry-reminders` (Vercel Cron, daily 09:00 UTC, protected by
  `CRON_SECRET`) emails every unused voucher expiring within 48 hours, once:
  `claim_expiry_reminders()` claims atomically via `vouchers.reminder_sent_at`
- **Rate limits** (per client IP, counted in Postgres so all serverless instances share them):
  checkout 20 / 10 min, tracking 30 / 10 min, report 10 / 10 min, invite accept 10 / 10 min, invite
  view 60 / 10 min, walk-in check 60 / 10 min per restaurant. 429 + `Retry-After`
- **Security headers** on every response: `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`
- **Security review:** Supabase advisor run; `current_restaurant_id()` no longer callable by anon
  (migration 011). All 15 server-only functions refuse anonymous callers (permission denied).
  The production bundle and served HTML contain no secret (only the public anon key)
- **Mock layer deleted** (`useMockDb.ts`)
- **Verified live:** 16 new checks + a full regression of every earlier stage (189 checks) on the
  final code

### ✅ After Stage 7 — Infobip (email + WhatsApp)
- **Email** now goes through Infobip (`no-reply@voucher.kokosend.com`) instead of Resend. Same
  designs, preheaders, plain-text versions and Reply-To (admin email). Resend removed from the code
- **WhatsApp** goes out through the 7 Meta-approved templates, filled with real values:

  | Event | Template | Values |
  |---|---|---|
  | Voucher issued / resent | `kokosend_voucher_ready` | first name, amount, code, expiry date |
  | Voucher expiring (daily job) | `kokosend_voucher_expiring` | first name, amount, code, expiry date |
  | Order placed | `kokosend_order_placed` | first name, reference, combo, restaurant |
  | Order accepted | `kokosend_order_preparing` | restaurant, reference |
  | Order dispatched | `kokosend_order_on_the_way` | reference, restaurant |
  | Order delivered | `kokosend_order_delivered` | reference, restaurant |
  | Order rejected, or cancelled because the restaurant was disabled | `kokosend_order_rejected` | restaurant, reference, reason |

  Voucher-related messages go to the voucher's phone; order messages go to the WhatsApp number
  the customer gave at checkout. Buttons link to `https://voucher.kokosend.com/…` (fixed in the
  approved templates, so this holds even on demo)
- **No template yet → email only**, logged as *skipped*: walk-in receipt, voucher cancelled
- **Phone numbers:** every phone field (generate voucher, checkout phone + WhatsApp, restaurant
  contact) uses `app/components/ui/PhoneInput.vue`: a country picker (default from the currency:
  NGN → Nigeria, KES → Kenya, USD → US) plus the number, a live "WhatsApp messages will go to
  +234 803 000 0001" line, and plain-language errors ("too short for a Nigeria number"). A leading 0
  is dropped automatically; pasting `+254…` switches the country. The server refuses anything that
  isn't a valid international number (`internationalPhone` in `server/utils/http.ts`) and stores
  E.164. Shared rules: `shared/utils/phone.ts`. Numbers saved before this change may be in local
  form: `toWhatsappNumber` still converts those using the voucher currency, and `PhoneInput`
  converts them when an edit form opens
- **Notification log:** WhatsApp rows now show *sent* (with Infobip's message id) or *failed*
  (with Infobip's reason), like email
- **Test page** `/admin/infobip-test` (admin only, not in the menu) stays for diagnostics: send a
  test email / template, check template approval status

### ✅ Address suggestions (MapTiler)
- **Database (migration 012):** `orders.street_address` (required for new orders),
  `orders.delivery_latitude/longitude`, `restaurants.latitude/longitude` (both-or-neither and range
  checks); `public_menu` exposes the restaurant's location; `place_order()` takes the street and
  location (old signature dropped)
- **`app/components/ui/AddressInput.vue`:** suggestions after 3 letters and a 300 ms pause, up to
  5, keyboard + touch, filtered to delivery-relevant place types (no lagoons/coastlines/regions),
  limited to a country and ranked near a point when given. `v-model` = text,
  `v-model:location` = picked point or null. Coordinates are never displayed. Works as a plain
  field if the key is missing or MapTiler fails
- **Checkout:** new required "Street / area" field (country from the restaurant's currency,
  nearest the restaurant first). **Admin restaurant create / edit:** address with suggestions;
  a hand-typed address clears the old location
- **Restaurant + admin order pages:** "Open in Maps" when the order has a location. The street is
  part of the address line everywhere (tracking, order pages, order emails)
- **Server:** `geoPoint` validator in `server/utils/http.ts`; checkout requires the street / area
- **Test page** `/admin/maptiler-test` (admin only, not in the menu): try searches, see raw
  responses and whether the key works from the browser
- **Verified live:** 10 checks (pins saved / cleared correctly, typed addresses accepted, database
  refuses half or impossible locations, checkout requires the street, tracking shows it)

## Deploying to Vercel

**1. Import the project**
1. Push the `devs` branch to GitHub (or GitLab / Bitbucket).
2. On https://vercel.com → **Add New… → Project** → import the repository.
3. Framework preset: **Nuxt.js** (auto-detected). Leave the build and output settings as detected.

**2. Environment variables** (Project → Settings → Environment Variables, for *Production* and
*Preview*):

| Variable | Value |
|---|---|
| `NUXT_PUBLIC_SUPABASE_URL` | `https://wntedncojkxjtwvcecav.supabase.co` |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key (same as `.env`) |
| `NUXT_PUBLIC_SITE_URL` | your production URL, e.g. `https://kokosend.vercel.app` — no trailing slash |
| `NUXT_SUPABASE_SERVICE_ROLE_KEY` | service_role key — **mark as Sensitive** |
| `NUXT_INFOBIP_API_KEY` | Infobip API key — **mark as Sensitive** |
| `NUXT_INFOBIP_BASE_URL` | your Infobip base URL (`https://xxxxx.api.infobip.com`) |
| `NUXT_INFOBIP_WHATSAPP_FROM` | WhatsApp sender number, digits only |
| `NUXT_EMAIL_FROM` | `KokoSend <no-reply@voucher.kokosend.com>` |
| `NUXT_PUBLIC_MAPTILER_API_KEY` | MapTiler key (public by design; restrict it to your domains in the MapTiler dashboard) |
| `CRON_SECRET` | a new long random string (not the local one) — **mark as Sensitive** |

Do **not** add `SUPABASE_ACCESS_TOKEN` or `SUPABASE_DB_PASSWORD`; they are for the CLI on your
machine only.

**3. Deploy**, then note the production URL. If you change `NUXT_PUBLIC_SITE_URL` later, redeploy.

**4. Supabase → Authentication → URL Configuration**
- **Site URL:** your production URL.
- **Redirect URLs:** add `https://<your-domain>/restaurant/reset-password` (keep the localhost one
  for local development).

**5. Cron:** `vercel.json` schedules the daily reminder; it appears under Project → Settings →
**Cron Jobs** after the first production deploy. Vercel sends `CRON_SECRET` automatically.

**6. Check it's live**
- Open `/admin/login` and sign in as `admin@kokosend.com`.
- Add a test restaurant with an email you can read. The invite link in that email must point at
  your production URL, not localhost.
- On a phone, open `/menu`.

**Before real customers:** replace the placeholder Terms and Privacy pages, switch on Supabase
**Leaked password protection** (Authentication → Sign In / Providers → Email; may require a paid
plan), and add your own domain in Vercel if you have one (then update `NUXT_PUBLIC_SITE_URL` and the
Supabase URLs to match).
