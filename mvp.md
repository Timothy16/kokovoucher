# KokoSend — MVP Build Guide (v3)

> **KokoSend** is a standalone web app for issuing, redeeming, and delivering fixed‑value restaurant food vouchers. Admin issues a voucher to a customer (identified by their **KokoSend username**, used here as a "secret key"). The customer either orders delivery from a menu of partner restaurants, or walks into any partner restaurant and redeems the voucher in person. This document is the single source of truth for the **product**: business rules, lifecycles, money, notifications and screens. **How it is built** (Supabase, server routes, Infobip, deployment, conventions) lives in [`README.md`](./README.md), and the exact database schema lives in `supabase/migrations/`.

**v3 (October 2026)** brings this document in line with the built system: the app runs on a real backend, sends real email and WhatsApp, and includes the decisions made while building it. §11 lists what changed since v2. v2 replaced the original OTP‑claim, restaurant‑bound, 24‑hour voucher model entirely; §9 records that.

---

## 1. What we're building

Admin creates restaurants and their menus, then issues a fixed‑value voucher to a named customer (full name, phone, email, and their **KokoSend username as the secret key**). The customer is notified by email and WhatsApp with the voucher code, a link to browse the partner menu, and a note that their secret key is their KokoSend username. The voucher is **not tied to one restaurant** — it can be spent at any partner restaurant, in one of two ways:

- **Delivery** — customer browses combos across all restaurants, picks one, enters delivery details, and verifies their voucher code + secret key last. The restaurant fulfils and marks it delivered; that credits the restaurant's wallet.
- **Walk‑in** — customer visits any partner restaurant in person. The restaurant looks up the voucher, verifies the secret key, enters the actual bill amount, and completes the redemption; the restaurant is credited `min(voucher value, bill)`.

Every voucher is single‑use and valid for **7 days**, expiring at 23:59:59 **UTC** at the end of day 7. Money owed to restaurants accrues in a wallet and is paid out by admin in batches, with the ability to revoke a credit if a delivery is disputed.

### Three user roles
- **Customer** — never logs in. Identified only by voucher code + secret key (KokoSend username).
- **Admin** — onboards restaurants (by invite), builds menus, issues vouchers, monitors orders and walk‑ins, resolves disputes, runs payouts.
- **Restaurant** — joins via an admin‑sent invite link (not open registration), logs in, manages combo availability, fulfils delivery orders, completes walk‑ins, tracks its wallet.

---

## 2. Core business rules

1. **Currencies:** NGN (₦), KES (KSh), USD ($). Each restaurant has one currency (set by admin). Each voucher has one currency (set by admin at issue time). **Amounts:** USD may have cents; NGN and KES are whole numbers (vouchers and walk‑in bills alike).
2. **Voucher validity:** 7 days by default (admin can change it in Settings, 1–90 days; changes apply to new vouchers only). The issue day counts as day 1, and the voucher expires at **23:59:59 UTC** at the end of the last day. Times are shown to people in their own timezone.
3. **One active voucher per secret key:** admin cannot issue a new voucher to a KokoSend username that already has an `ISSUED` or `RESERVED` voucher. A new voucher can be issued once the previous one is `REDEEMED`, `EXPIRED`, or `VOID`. Usernames are compared ignoring case and surrounding spaces.
4. **Single use:** a voucher is redeemed once only — either via one completed delivery order, or one walk‑in — enforced with an atomic state transition guarded against races (see §5).
5. **Not restaurant‑bound:** any active restaurant can fulfil any voucher, subject to currency match (rule 8).
6. **Restaurant onboarding:** admin creates the restaurant record → admin sends an invite link to the restaurant's email → restaurant opens the link, sets a password, and is immediately `active` (no separate approval step; the invite *is* the approval). No open self‑registration. The contact email becomes the restaurant's login, so it can't already belong to another account.
7. **Delivery credit:** on marking an order `DELIVERED`, the restaurant's wallet is credited the **full voucher value**. Admin reviews at payout time and can revoke a specific credit if delivery is disputed (see §5, Payouts).
8. **Currency match:** a voucher can only be spent (delivery or walk‑in) at a restaurant whose currency matches the voucher's currency. Mismatches are blocked with a clear message, not silently converted.
9. **Rejected and cancelled delivery orders:** a restaurant can **reject** an order it can't fulfil while it is `PLACED` or `RECEIVED`, and must give a reason (shown to the customer). An order is **cancelled** only when admin disables its restaurant (rule 22). Either way the voucher goes back to `ISSUED` (or `EXPIRED` if its window has passed) so the customer can try again elsewhere, and the customer is notified.
10. **Walk‑in credit:** restaurant enters the actual bill amount; credit = `min(voucher value, bill)`. **Any unused balance is forfeited** — it does not roll over, and the voucher is fully consumed either way. This is stated up front on the redeem screen and in the customer's voucher-info messaging.
11. **Walk‑in safety alert:** immediately after a walk‑in is completed, the customer is notified ("₦X redeemed at [Restaurant]. Not you? Report it.") giving them a way to flag unauthorized use. Replies to the alert reach the admin inbox.
12. **Combos have no price field.** Admin knows restaurant menu costs and keeps voucher amounts in a sensible range; the app does not enforce combo price vs. voucher value.
13. **Combo availability:** admin creates/edits combos; the restaurant can toggle a combo available/unavailable (e.g. sold out today). Unavailable combos don't show on the public menu.
14. **Delivery:** free, no service-area restriction for MVP. A restaurant can reject an order it can't fulfil (rule 9 applies).
15. **Payouts:** no bank details collected. Admin's payout page shows each restaurant's pending wallet balance (sum of un‑paid‑out credits). Admin clicks **Process payout** → confirms → balance resets to zero and a payout record is kept. Admin can **revoke** an individual pending credit — delivery or walk‑in — before payout if it's disputed (reason required; removes it from the pending balance; does not affect already-paid-out payouts). The payout screen flags which pending items belong to disputed orders. A payout that includes an open dispute is **refused unless admin explicitly confirms "pay anyway"** (recorded in the audit log). A payout is also refused if the balance changed since admin opened the page (a new credit arrived or one was revoked), so admin always pays exactly the amount they reviewed.
16. **Restaurant login:** one login per restaurant (no multi-staff accounts in MVP).
17. **Admin:** one admin login for MVP; all sensitive actions (issue, void, resend, revoke, payout, invite, restaurant edit, disable/enable, combo changes, dispute resolution, settings) are written to an audit log so multi-admin support can be added later without a data-model change.
18. **Secret key hygiene:** verifying voucher code + secret key (both at delivery checkout and at walk-in) shares one counter: **5 wrong secret keys lock the voucher**. Error messages are generic — a wrong code and a wrong key get the same message, and the message does not show how many tries are left (that would reveal the code exists). Why a voucher can't be used (cancelled, already used, expired, held by an order in progress) is only shown once the secret key is correct. Admin can see a voucher's attempt count and lock status on its detail page (and a lock indicator in the vouchers list), so a "my voucher won't work" complaint can be diagnosed and resolved with void + reissue. Public pages (checkout, order tracking, problem reports, invite links) are also rate-limited per connection.
19. **Idempotent issuing:** the "Create voucher" confirm action must not be double-submittable (double-click / double-submit guard). Rule 3 also makes a duplicate impossible.
20. **Restaurant editing:** admin can edit a restaurant's profile (name, address, logo, contact person/number, currency) at any time after creation. Currency changes are blocked while the restaurant has a nonzero pending payout balance **or any delivery order in progress**, since every credit inherits its voucher's currency and mixing currencies in one balance would corrupt the payout total. The login email can't be changed.
21. **Invite security:** invite links are single use and expire after **7 days**. Resending a restaurant's invite issues a fresh link, invalidating any previously shared/leaked one.
22. **Disabling a restaurant releases its in-flight work:** any delivery order still `PLACED`/`RECEIVED`/`DISPATCHED` for a restaurant being disabled is auto-cancelled, its voucher is released back to `ISSUED` (or `EXPIRED` if the window has passed), and the customer is notified — since a disabled restaurant can no longer log in to handle it themselves. A disabled restaurant loses access immediately, even if it is still logged in.
23. **Combo photo:** required on every combo, admin-uploaded (not a URL): JPG, PNG or WebP, up to 2 MB. Replaced photos are deleted.
24. **Combo checkout options:** per combo, admin can enable a **spice choice** (spicy/non-spicy) and/or **drink options** (admin-named sodas, up to 10, plus an optional "water available" toggle). If enabled, the customer must pick one at checkout — these aren't optional add-ons, they're part of what's included with the combo. A combo with neither enabled skips both steps entirely.
25. **Checkout order:** the customer configures the whole order first — spice choice (if applicable), drink choice (if applicable), then delivery details — and verifies their voucher code + secret key **last**, immediately before the order is placed. This trades a small risk (filling in the whole order before discovering a bad/mismatched voucher) for a more natural "build the order, then pay" feel.
26. **Delivery details** are structured fields, not one address blob: full name, phone number, WhatsApp number (defaults to the phone number via a "same as phone" toggle, but can differ), **street / area** (with address suggestions, rule 31), house/apartment name, house number, floor, nearest landmark (optional), a **drop option** (Door drop / Leave at the gate), and optional additional information.
27. **Phone numbers** always include the country code, so WhatsApp can reach them. Every phone field has a **country picker** (defaulted from the currency: NGN → Nigeria, KES → Kenya, USD → United States) next to the number; a leading 0 is dropped automatically, and the field confirms the exact number messages will go to. Numbers without a valid country code are refused.
28. **Restaurant passwords:** at least 8 characters. A restaurant can reset a forgotten password by email, and changing it from Settings requires the current password.
29. **Disputes:** on a delivered order, the customer can report a problem (once). That opens a dispute for admin, which admin closes as **resolved** with a note. A dispute never moves money by itself; admin revokes the credit separately if the complaint holds up.
30. **Expiry reminder:** once, about a day and a half before a still-unused voucher expires, the customer is reminded by email and WhatsApp.
31. **Address suggestions:** the checkout street / area and the restaurant's address suggest real places as people type (streets, estates, areas, buildings and landmarks; not lagoons, coastlines or whole regions). At checkout they come from the restaurant's country and the nearest to the restaurant come first. Picking a suggestion also saves its map location (never shown as numbers), which gives restaurant and admin an **Open in Maps** link for the rider. Typing an address that isn't suggested is always allowed; it just has no map location. Editing a restaurant's address by hand removes its old location.

---

## 3. Design system (Drocsid‑inspired: warm, human, trustworthy)

Unchanged from v1 — warm and friendly, tightened on money‑sensitive screens.

### Colour tokens
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F8F7F4` | app background (warm off‑white) |
| `--surface` | `#FFFFFF` | cards, forms, modals |
| `--primary` | `#2F7D6B` | buttons, links, brand accents |
| `--primary-hover` | `#276657` | button hover |
| `--success` | `#2E9E6B` | valid / redeemed / delivered confirmation |
| `--error` | `#D64545` | invalid / expired / already‑used / rejected |
| `--warning` | `#E0A43B` | pending / expiring‑soon / disputed |
| `--ink` | `#1A1A1A` | primary text / headings |
| `--muted` | `#6B6B6B` | secondary text |
| `--border` | `#E7E4DD` | dividers, input outlines |

### Style
- **Radius:** 12–16px on cards/buttons/inputs; pills for status badges.
- **Shadow:** soft, low‑opacity (e.g. `0 4px 16px rgba(0,0,0,0.06)`).
- **Type:** friendly readable sans‑serif (Plus Jakarta Sans). Clear hierarchy, generous line height.
- **Spacing:** roomy; comfortable touch targets for mobile.
- **Microcopy:** warm and human, but money/redemption results stay crisp and unambiguous (especially forfeited-balance and currency-mismatch messages — no room for ambiguity there).
- **Mobile-first:** every screen must be fully usable at mobile width — this is an explicit requirement, not an afterthought. Restaurant redeem/walk-in and customer checkout are the highest-traffic mobile screens.
- **Emails** share the same palette and type: one branded layout (voucher "ticket", details, numbered steps, callouts, one full-width button), readable in Gmail, Outlook and Apple Mail, on phones, and with images off.

### Status badge colours
- Voucher: `ISSUED` = muted grey · `RESERVED` = warning · `REDEEMED` = success · `EXPIRED` = error/muted · `VOID` = muted.
- Restaurant: `INVITED` = warning · `ACTIVE` = success · `DISABLED` = muted.
- Order: `PLACED` = warning · `RECEIVED` = primary · `DISPATCHED` = primary · `DELIVERED` = success · `CANCELLED`/`REJECTED` = error.
- Payout: `PENDING` = warning · `PAID` = success · `REVOKED` (line item) = error.

---

## 4. Lifecycles (states)

### Voucher
`ISSUED` → `RESERVED` (delivery order placed, holds the voucher) → `REDEEMED` (order delivered, or walk‑in completed).
`RESERVED` → `ISSUED` if the order is rejected/cancelled and the voucher hasn't expired (→ `EXPIRED` if it has).
`ISSUED` → `EXPIRED` when its window passes without redemption. A `RESERVED` voucher is **not** expired while its order is in progress, so an order placed on the last day can still be delivered.
`ISSUED` → `VOID` if admin manually voids it (e.g. issued to wrong secret key). Only an unused, unexpired voucher can be voided.

### Restaurant account
`INVITED` (admin created + sent invite, no login yet) → `ACTIVE` (accepted invite, set password) · or `DISABLED` (admin can disable at any time; disabled restaurants can't log in, receive new orders, or appear on the public menu — and disabling auto-cancels any in-flight delivery orders, releasing their vouchers). `DISABLED` → `ACTIVE` when admin re-enables it.

### Delivery order
`PLACED` → `RECEIVED` → `DISPATCHED` → `DELIVERED` (wallet credited). Steps can't be skipped.
`PLACED` or `RECEIVED` → `REJECTED` (restaurant can't fulfil; reason required) — voucher released.
`PLACED`, `RECEIVED` or `DISPATCHED` → `CANCELLED` only when admin disables the restaurant (rule 22) — voucher released.

### Dispute (on a delivered order)
none → `OPEN` (customer reports a problem; once per order) → `RESOLVED` (admin, with a note). Money is handled separately (revoke on the payout page).

### Walk‑in redemption
Single-step: `COMPLETED` (created and credited atomically; no intermediate states). Voucher moves directly to `REDEEMED`.

### Payout line item (one per delivered order / completed walk-in, per restaurant)
`PENDING` → `PAID` (included in a processed payout) · or → `REVOKED` (admin pulls it from pending balance before payout; requires a reason note).

---

## 5. Money model

- **Wallet balance** for a restaurant is *derived*, never stored as a single mutable number: it's the sum of `PENDING` payout line items for that restaurant.
- A **payout line item** is created automatically the moment an order is marked `DELIVERED` or a walk‑in is `COMPLETED`, for the credited amount (full voucher value for delivery; `min(voucher, bill)` for walk‑in). Each order or walk‑in can be credited once only.
- **Revoke** (admin, pre-payout only): flips a `PENDING` line item to `REVOKED` with a required reason; it drops out of the wallet balance; the restaurant is notified.
- **Process payout** (admin): takes all of a restaurant's current `PENDING` line items, flips them to `PAID`, stamps a payout record (restaurant, total, item count, timestamp, who processed it, optional reference note) → restaurant's derived balance goes to zero. A paid item can no longer be revoked. Refused if the balance changed since admin opened the page, or if an item is under open dispute and admin hasn't confirmed "pay anyway" (rule 15). A payout and a revoke of the same item at the same moment can never both succeed.
- Totals are the database's own sums, so USD cents stay exact.
- This append-only design gives a full audit trail (nothing is ever destructively edited).

---

## 6. Notifications

Email and WhatsApp are sent for real, both through **Infobip**:
- **Email** from `no-reply@voucher.kokosend.com`. Replies from customers and restaurants reach the admin email set in Settings. The voucher code never appears in an email's inbox preview line.
- **WhatsApp** only through templates approved in advance by Meta. Order messages go to the WhatsApp number given at checkout; voucher messages go to the voucher's phone number.
- Every message is written to the **Notification Log** (visible to admin) before it is sent, with channel, recipient, subject, summary and outcome: *sent* (accepted by Infobip), *failed* (with the reason) or *skipped* (no WhatsApp template exists for that event). A failed message never undoes the action that triggered it.

| Event | Customer | Restaurant | Admin |
|---|---|---|---|
| Voucher issued (or resent by admin) | Email + WhatsApp: code, menu link, "secret key = your KokoSend username" note | | |
| Voucher expiring (once, within ~48 hours of expiry) | Email + WhatsApp | | |
| Voucher voided by admin | Email: cancelled, reason if given (no WhatsApp template yet) | | |
| Delivery order placed | Email + WhatsApp: confirmation | Email: new order | Email |
| Order accepted / dispatched | Email + WhatsApp | | |
| Order delivered | Email + WhatsApp: "delivered — didn't receive it? Report" link | | |
| Order rejected (restaurant) or cancelled (restaurant disabled) | Email + WhatsApp: reason; voucher released, try again | | |
| Problem reported on a delivered order | | | Email |
| Walk‑in redeemed | Email: receipt + safety alert ("not you? reply") (no WhatsApp template yet) | | |
| Restaurant invited (incl. resend) | | Email: invite link | |
| Password reset requested | | Email: reset link (sent by the login system) | |
| Payout processed | | Email: amount paid | |
| Payout item revoked | | Email: reason | |

---

## 7. Pages

Every screen needs **loading**, **empty**, and **error** secondary states unless noted, and must be verified at mobile width.

### 7.0 Landing page
Unchanged intent from v1 — public marketing site selling restaurants on partnering, routing restaurants and admin to their logins. Nav → Hero → How it works → For restaurants → Trust strip → Final CTA → Footer (with tucked-away Admin login).

### 7.1 Customer pages (no login, public)
1. **Menu browse** (`/menu`) — combos from all active restaurants, filterable by restaurant, category, currency. Unavailable combos hidden. Carries the redeem-choice messaging inline (a banner explains you can either check out with a voucher here, or walk into any partner restaurant in person) rather than as its own separate screen.
2. **Combo detail** (`/menu/[id]`) — image, description, restaurant, category; CTA into checkout.
3. **Checkout** (`/checkout/[comboId]`) — a single page, a dynamic sequence of steps depending on what the combo offers: **(a) spice choice** (only if the combo has one), **(b) drink choice** (only if the combo has soda/water options — pick exactly one), **(c) delivery details** (the structured fields above: country pickers on the phone fields, address suggestions on the street / area), **(d) verify** code + secret key — last, not first (generic error + lockout on failure; currency-mismatch message links back to a filtered menu), **(e) confirmation** (order reference + next steps).
4. **Order tracking** (`/track`) — look up by order reference + secret key (links in order emails fill in the reference); shows status timeline; after a rejection/cancellation says whether the voucher is usable again; if delivered, a "didn't receive it? report a problem" action is inline on the same page (not a separate screen) and opens a dispute for admin (does not auto-reverse).
5. **Invalid / expired / already‑used / locked voucher** — not a dedicated route; shown as an inline state wherever a voucher is checked (checkout verify step, walk‑in), since there's no per-customer claim link to land on.
6. **How it works / FAQ / Terms / Privacy / Contact** — static content pages. (Terms and Privacy still hold placeholder text.)

### 7.2 Admin pages
1. **Login**
2. **Dashboard** — issued / redeemed / expired today, vouchers in delivery now, open disputes, restaurants yet to accept their invite, pending payouts per currency, recent vouchers.
3. **Restaurants — list** — name, currency, status, wallet balance, redemption count, combo count.
4. **Restaurants — create** — name, address (with suggestions, rule 31), logo (optional), contact person, contact number, contact email (needed for invite; becomes their login), currency. Shows the invite link to copy in case the email doesn't arrive.
5. **Restaurant detail** — profile (editable: name, address, logo, contact person/number, currency — currency edits blocked per rule 20), invite status/resend (rotates the invite link), menu shortcut, wallet, order history, walk-in history, disable/re-enable toggle.
6. **Menu manager** (per restaurant, also linked directly from each card on the restaurants list) — list combos; **Add combo** and **Edit combo** are their own pages (not a modal), sharing one form component: name, short description, category, **required photo upload**, description, optional **spice choice** toggle, optional **soda options** list + **water available** toggle; no price field.
7. **Generate voucher** — full name, phone (with country picker), email, secret key (KokoSend username), value, currency → confirm dialog ("Are you sure you want to create a voucher for this username?", showing the value, email and WhatsApp number) → on confirm, generates unique code and triggers notifications. Blocks if that secret key already has an active voucher (rule 3).
8. **Vouchers list** — filters (status, currency, date); columns: code, customer, secret key, value, status, created, expires; lock indicator. Row actions: view, resend notification, void.
9. **Voucher detail** — full audit trail (issued → delivery reserved/redeemed or walk-in → expired/void), each with timestamp; attempt count and lock status; linked order or walk-in.
10. **Orders list** — filters (status, restaurant, dispute state); delivery orders.
11. **Order detail** — status timeline, customer + restaurant info (with **Open in Maps** when the address was picked from suggestions), voucher link, whether the restaurant's credit is pending/paid/revoked, dispute details and **resolve dispute** (with a note).
12. **Walk‑ins list** — restaurant, voucher, bill amount, credited amount, forfeited amount, timestamp.
13. **Payouts** — per‑restaurant pending balance with each credit (linked to its order), disputed credits highlighted; **Process payout** (confirm, optional payment reference, "pay anyway" for disputes); payout history; **revoke** a pending line item (reason required) with visible discrepancy trail.
14. **Notification log** — every email and WhatsApp with its outcome (sent / failed / skipped), filterable by channel, recipient and status.
15. **Audit log** — every sensitive admin action with timestamp, filterable by area, linked to what it changed.
16. **Settings** — admin contact email (gets admin notifications and replies; not hardcoded in messages), voucher validity window (default 7 days).
17. **Infobip test** (`/admin/infobip-test`, not in the menu) — diagnostics: send a test email or WhatsApp template, check template approval status.

### 7.3 Restaurant pages
1. **Accept invite** — from admin's invite link: set password → active → signed in. Explains clearly if the link is invalid, replaced, expired or already used.
2. **Login** — active restaurants only.
3. **Forgot password** / **Reset password** — request a reset link by email; set a new password from the link.
4. **Disabled notice** — shown if admin has disabled the account.
5. **Dashboard** — new and open orders, wallet balance snapshot, quick links, recent orders.
6. **Menu** — read view of admin-managed combos with an **availability toggle** per combo.
7. **Orders inbox** — incoming delivery orders, updating live; new-order count in the menu and a pop-up when one arrives.
8. **Order detail** — customer + delivery info, with **Open in Maps** when the address was picked from suggestions; status actions (accept → dispatch → mark delivered, with a confirmation step; or reject with reason).
9. **Walk‑in redeem** — enter voucher code + secret key (typed; there is no QR scanner) → verify (shows currency mismatch / not usable / locked as relevant) → enter bill amount with a live preview of credit, amount to collect and forfeit → complete (credits wallet, forfeits any remainder, fires customer safety alert) → receipt.
10. **Wallet** — current pending balance, ledger of credits/revocations (with reasons), payout history.
11. **Profile / settings** — restaurant details (view), change password.

**Screen count (as built):** 1 landing + 9 customer routes (incl. 5 static pages; several product "screens" above are consolidated into fewer routes as steps/inline states) + 19 admin routes (incl. the Infobip test page) + 12 restaurant routes — 41 routes total.

---

## 8. Data model (summary)

The schema itself is defined in `supabase/migrations/` (generated TypeScript types: `shared/types/database.types.ts`); this section only names the records and what each is for.

| Record | Holds |
|---|---|
| **Restaurant** | name, address + map location (when picked from suggestions), logo, contact person / number / email (the login), currency, status (`invited` / `active` / `disabled`), invited / activated / disabled times. Logins are separate accounts in the auth system; passwords are never stored here |
| **Restaurant invite** | one row per invite link sent; only a hash of the link's secret is kept, plus when it expires, was used or was replaced |
| **Combo** | restaurant, name, short description, description, category, photo, available, spice choice, soda options, water option |
| **Voucher** | code (`XXXX-XXXX`, no look-alike characters), customer name / phone / email, secret key (KokoSend username), currency, amount, status, how and when it was redeemed, expiry, wrong-attempt count and lock time, void reason, reminder sent time |
| **Voucher event** | the voucher's audit trail: issued, reserved, released, redeemed (delivery / walk-in), expired, voided, each with a time and note |
| **Order** | reference (`KV-XXXXXX`), voucher, combo, restaurant, value + currency (copied from the voucher), status, spice / drink choice, the structured delivery details (incl. street / area + map location when picked), dispute state + note + resolution note |
| **Order status history** | every status change of an order, with time and note (e.g. the rejection reason) |
| **Walk-in** | voucher, restaurant, currency, bill, credited amount, forfeited amount |
| **Payout item** | one credit per delivered order or completed walk-in: restaurant, source, amount, currency, status (`pending` / `paid` / `revoked`), revoke reason, payout it was paid in |
| **Payout** | restaurant, total, currency, item count, payment reference, when and by whom it was processed |
| **Notification** | every email and WhatsApp: channel, recipient, template, subject, summary, outcome (`sent` / `failed` / `skipped`), provider message id, error |
| **Audit log entry** | actor, action (e.g. `voucher.void`, `payout.process`), target, note, time |
| **Settings** | admin email, voucher validity days |

Status values are the ones in §4. Phone numbers are stored in international form (`+2348030000001`). Orders placed before the street / area field existed have none.

---

## 9. What changed from v1 (for context)

- Voucher claim via OTP is **removed**; replaced by **voucher code + secret key** (KokoSend username) verification.
- Voucher is **no longer bound to a single restaurant**; redeemable at any active restaurant of matching currency.
- Validity extended from **24 hours to 7 days**, expiring end of day 7.
- Restaurant onboarding is **admin-invite-only**, not open self-registration with approval.
- Redemption is no longer just an in-person scan — added the full **delivery order flow** (menu, checkout, order lifecycle, restaurant fulfilment).
- Added **money movement**: wallets, payout line items, payouts, and admin revoke — none of this existed in v1.
- Added **combos/menu management** entirely (didn't exist in v1).
- Added **notification log**, **audit log**, and dispute reporting.
- The v1 rule "message never contains the redeemable code" is **reversed** — the code is now sent directly, with the secret key as the second factor instead.

---

## 10. Out of scope for MVP
- Real KokoSend secret-key verification against a live KokoSend system (secret key is just matched as entered for now; pluggable verifier for later).
- Restaurant bank details / real payout transfer (payout is a confirm-only status flip for MVP).
- Multi-staff restaurant logins and multi-admin roles (single login each, but audit-logged so this can be added later).
- Delivery fees / service-area restrictions.
- Partial/split voucher redemption (walk-in leftover is forfeited, not banked).
- QR codes of any kind (the walk-in scanner was removed; codes are typed), including a live/rotating-QR anti-screenshot upgrade.

**Known gaps, planned next** (not out of scope): WhatsApp templates for the walk-in receipt and voucher voided; the notification log showing *delivered* rather than only *accepted by Infobip*.

---

## 11. What changed from v2 (October 2026)

- **Real backend:** the app runs on Supabase; the mock (localStorage) data layer is gone. Business rules are enforced in the database, so no screen can bypass them.
- **Real notifications:** email and WhatsApp are sent through Infobip (§6), replacing the mocked Notification Log. WhatsApp uses Meta-approved templates; two events are email-only until their templates exist.
- **Brand:** the product is **KokoSend** (was KokoVoucher).
- **Expiry in UTC** (rule 2); reserved vouchers aren't expired mid-delivery (§4); a one-time expiry reminder is built (rule 30, was "optional").
- **Orders:** restaurants *reject* (with a reason); *cancelled* only comes from disabling a restaurant (rule 9). Disputes gained a resolved state (rule 29).
- **Security:** 5-try lockout with generic messages and no remaining-attempts count (rule 18); per-connection rate limits on public pages; invite links expire after 7 days (rule 21); restaurant password rules and self-service reset (rule 28).
- **Money:** payouts refused when the balance changed since it was reviewed, and disputed credits need an explicit "pay anyway" (rule 15); currency changes also blocked while orders are in progress (rule 20).
- **Phone numbers:** country picker on every phone field; stored in international form (rule 27).
- **Addresses:** checkout gained a required street / area field; it and the restaurant address suggest real places as people type, and picked ones get an Open in Maps link (rule 31).
- **Walk-in:** QR scanner removed; bill entry shows a live credit / collect / forfeit preview.
- **Pages:** forgot/reset password and the Infobip test page added; 41 routes (§7).
- **Data model:** §8 now summarises the real records and points to the migrations, instead of listing mock TypeScript types.
