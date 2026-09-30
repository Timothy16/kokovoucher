# KokoSend

Fixed-value restaurant food vouchers. Admin issues a voucher to a customer (identified by their
**KokoSend username**, used as a secret key). The customer spends it once — by **delivery** from
the partner menu, or by **walking into** any partner restaurant. Restaurants are credited in a
wallet and paid out by admin.

- **Product spec (source of truth):** [`mvp.md`](./mvp.md) — business rules, lifecycles, screens.
- **This file:** how it's built, how to run it, and where each build stage stands.

---

## Stack

| Layer | Choice |
|---|---|
| App | Nuxt 4 (Vue 3), client-rendered (`ssr: false`), Tailwind |
| Server | Nuxt server routes (`server/api/*`), deployed on **Vercel** |
| Database / Auth / Storage | **Supabase** (Postgres + RLS, Auth, Storage, Realtime, pg_cron) |
| Email | **Resend** (app emails from the server; Supabase Auth emails via Resend SMTP) |
| WhatsApp | **Not integrated yet** — logged as `skipped` in the notification log (`TODO(whatsapp)`) |

## How the system is put together

```
Browser ──reads (RLS)──────────────▶ Supabase Postgres
   │
   └──writes: useApi() + JWT ──▶ /api/* (Nuxt server) ──service role──▶ Postgres functions / tables
                                        ├─▶ Resend (email)
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
| Passwords | Min 8 characters; forgot-password via Supabase Auth (sent through Resend) |
| Amounts | USD may have cents; NGN/KES are whole numbers (DB check constraint) |
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
                               notify (log + send), email (Resend + design system), email-templates,
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

- **Authentication → Emails → SMTP:** Resend (`smtp.resend.com`, port 465, user `resend`, sender `no-reply@rechargify.org`) ✅ done
- **Authentication → URL Configuration:** Site URL = the app URL; add
  `http://localhost:3000/restaurant/reset-password` (and the production equivalent) to **Redirect URLs**
- **Admin account:** created via the Auth admin API with `app_metadata: { "role": "admin" }` ✅ done (`admin@kokosend.com`)

### Deploying (Vercel)

See **[Deploying to Vercel](#deploying-to-vercel)** at the end of this file.

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
| `NUXT_RESEND_API_KEY` | Resend API key — **mark as Sensitive** |
| `NUXT_EMAIL_FROM` | `KokoSend <no-reply@rechargify.org>` |
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
