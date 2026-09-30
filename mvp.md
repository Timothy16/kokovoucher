# KokoSend — MVP Build Guide (v2)

> **KokoSend** is a standalone web app for issuing, redeeming, and delivering fixed‑value restaurant food vouchers. Admin issues a voucher to a customer (identified by their **KokoSend username**, used here as a "secret key"). The customer either orders delivery from a menu of partner restaurants, or walks into any partner restaurant and redeems the voucher in person. This document is the single source of truth for the MVP build — screens, business rules, data model, and mock data — currently built against a mock (localStorage) data layer, with a service-layer boundary so a real backend can replace it later without rewriting the UI.

This is a **v2 rewrite**. It replaces the original OTP‑claim, restaurant‑bound, 24‑hour voucher model entirely. See §9 for what changed and why.

---

## 1. What we're building

Admin creates restaurants and their menus, then issues a fixed‑value voucher to a named customer (full name, phone, email, and their **KokoSend username as the secret key**). The customer is notified by email and WhatsApp with the voucher code, a link to browse the partner menu, and a note that their secret key is their KokoSend username. The voucher is **not tied to one restaurant** — it can be spent at any partner restaurant, in one of two ways:

- **Delivery** — customer browses combos across all restaurants, picks one, verifies their voucher code + secret key, and enters delivery details. The restaurant fulfils and marks it delivered; that credits the restaurant's wallet.
- **Walk‑in** — customer visits any partner restaurant in person. The restaurant looks up the voucher, verifies the secret key, enters the actual bill amount, and completes the redemption; the restaurant is credited `min(voucher value, bill)`.

Every voucher is single‑use and valid for **7 days**, expiring at the end of day 7. Money owed to restaurants accrues in a wallet and is paid out by admin in batches, with the ability to revoke a credit if a delivery is disputed.

### Three user roles
- **Customer** — never logs in. Identified only by voucher code + secret key (KokoSend username).
- **Admin** — onboards restaurants (by invite), builds menus, issues vouchers, monitors orders and walk‑ins, runs payouts.
- **Restaurant** — joins via an admin‑sent invite link (not open registration), logs in, manages combo availability, fulfils delivery orders, completes walk‑ins, tracks its wallet.

---

## 2. Core business rules

1. **Currencies:** NGN (₦), KES (KSh), USD ($). Each restaurant has one currency (set by admin). Each voucher has one currency (set by admin at issue time).
2. **Voucher validity:** 7 days, expiring at **end of day 7** (23:59:59 on the 7th day after creation).
3. **One active voucher per secret key:** admin cannot issue a new voucher to a KokoSend username that already has an `ISSUED` or `RESERVED` voucher. A new voucher can be issued once the previous one is `REDEEMED`, `EXPIRED`, or `VOID`.
4. **Single use:** a voucher is redeemed once only — either via one completed delivery order, or one walk‑in — enforced with an atomic state transition guarded against races (see §5).
5. **Not restaurant‑bound:** any approved restaurant can fulfil any voucher, subject to currency match (rule 8).
6. **Restaurant onboarding:** admin creates the restaurant record → admin sends an invite link to the restaurant's email → restaurant opens the link, sets a password, and is immediately `active` (no separate approval step; the invite *is* the approval). No open self‑registration.
7. **Delivery credit:** on marking an order `DELIVERED`, the restaurant's wallet is credited the **full voucher value**. Admin reviews at payout time and can revoke a specific credit if delivery is disputed (see §5, Payouts).
8. **Currency match:** a voucher can only be spent (delivery or walk‑in) at a restaurant whose currency matches the voucher's currency. Mismatches are blocked with a clear message, not silently converted.
9. **Cancelled/rejected delivery orders:** release the voucher back to `ISSUED` (if not yet expired) so the customer can try again elsewhere. Customer is notified.
10. **Walk‑in credit:** restaurant enters the actual bill amount; credit = `min(voucher value, bill)`. **Any unused balance is forfeited** — it does not roll over, and the voucher is fully consumed either way. This is stated up front on the redeem screen and in the customer's voucher-info messaging.
11. **Walk‑in safety alert:** immediately after a walk‑in is completed, the customer is notified ("₦X redeemed at [Restaurant]. Not you? Report it.") giving them a way to flag unauthorized use.
12. **Combos have no price field.** Admin knows restaurant menu costs and keeps voucher amounts in a sensible range; the app does not enforce combo price vs. voucher value.
13. **Combo availability:** admin creates/edits combos; the restaurant can toggle a combo available/unavailable (e.g. sold out today). Unavailable combos don't show on the public menu.
14. **Delivery:** free, no service-area restriction for MVP. A restaurant can reject an order it can't fulfil (rule 9 applies).
15. **Payouts:** no bank details collected. Admin's payout page shows each restaurant's pending wallet balance (sum of un‑paid‑out credits). Admin clicks **Process payout** → confirms → balance resets to zero and a payout record is kept. Admin can **revoke** an individual pending credit — delivery or walk‑in — before payout if it's disputed (removes it from the pending balance; does not affect already-paid-out payouts). The payout screen flags which pending items belong to disputed orders and warns before processing a payout that includes one.
16. **Restaurant login:** one login per restaurant (no multi-staff accounts in MVP).
17. **Admin:** one admin login for MVP; all sensitive actions (issue, void, revoke, payout, invite, restaurant edit) are written to an audit log so multi-admin support can be added later without a data-model change.
18. **Secret key hygiene:** verifying voucher code + secret key (both at delivery checkout and at walk-in) is rate-limited — an attempt limit and lockout, generic error messages (don't reveal which of code/key was wrong). Admin can see a voucher's attempt count and lock status on its detail page (and a lock indicator in the vouchers list), so a "my voucher won't work" complaint can be diagnosed and resolved with void + reissue.
19. **Idempotent issuing:** the "Create voucher" confirm action must not be double-submittable (double-click / double-submit guard).
20. **Restaurant editing:** admin can edit a restaurant's profile (name, address, logo, contact person/number, currency) at any time after creation. Currency changes are blocked while the restaurant has a nonzero pending payout balance, since every pending payout item inherits its voucher's currency and mixing currencies in one balance would corrupt the payout total.
21. **Invite security:** resending a restaurant's invite issues a fresh token, invalidating any previously shared/leaked invite link.
22. **Disabling a restaurant releases its in-flight work:** any delivery order still `PLACED`/`RECEIVED`/`DISPATCHED` for a restaurant being disabled is auto-cancelled, its voucher is released back to `ISSUED` (or `EXPIRED` if the window has passed), and the customer is notified — since a disabled restaurant can no longer log in to handle it themselves.
23. **Combo photo:** required on every combo, admin-uploaded (not a URL). Stored as an image in the mock layer; a real backend would swap this for object storage.
24. **Combo checkout options:** per combo, admin can enable a **spice choice** (spicy/non-spicy) and/or **drink options** (admin-named sodas, plus an optional "water available" toggle). If enabled, the customer must pick one at checkout — these aren't optional add-ons, they're part of what's included with the combo. A combo with neither enabled skips both steps entirely.
25. **Checkout order:** the customer configures the whole order first — spice choice (if applicable), drink choice (if applicable), then delivery details — and verifies their voucher code + secret key **last**, immediately before the order is placed. This trades a small risk (filling in the whole order before discovering a bad/mismatched voucher) for a more natural "build the order, then pay" feel.
26. **Delivery details** are structured fields, not one address blob: full name, phone number, WhatsApp number (defaults to the phone number via a "same as phone" toggle, but can differ), house/apartment name, house number, floor, nearest landmark (optional), a **drop option** (Door drop / Leave at the gate), and optional additional information.

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

### Status badge colours
- Voucher: `ISSUED` = muted grey · `RESERVED` = warning · `REDEEMED` = success · `EXPIRED` = error/muted · `VOID` = muted.
- Restaurant: `INVITED` = warning · `ACTIVE` = success · `DISABLED` = muted.
- Order: `PLACED` = warning · `RECEIVED` = primary · `DISPATCHED` = primary · `DELIVERED` = success · `CANCELLED`/`REJECTED` = error.
- Payout: `PENDING` = warning · `PAID` = success · `REVOKED` (line item) = error.

---

## 4. Lifecycles (states)

### Voucher
`ISSUED` → `RESERVED` (delivery order placed, holds the voucher) → `REDEEMED` (order delivered, or walk‑in completed).
`RESERVED` → `ISSUED` if the order is cancelled/rejected and the voucher hasn't expired.
`ISSUED` or `RESERVED` → `EXPIRED` if 7 days pass without redemption.
`ISSUED` → `VOID` if admin manually voids it (e.g. issued to wrong secret key).

### Restaurant account
`INVITED` (admin created + sent invite, no login yet) → `ACTIVE` (accepted invite, set password) · or `DISABLED` (admin can disable at any time; disabled restaurants can't log in, receive new orders, or appear on the public menu — and disabling auto-cancels any in-flight delivery orders, releasing their vouchers).

### Delivery order
`PLACED` → `RECEIVED` → `DISPATCHED` → `DELIVERED` (wallet credited).
`PLACED` or `RECEIVED` → `CANCELLED` (restaurant) or `REJECTED` (restaurant, can't fulfil) — voucher released back to `ISSUED`.

### Walk‑in redemption
Single-step: `COMPLETED` (created and credited atomically; no intermediate states). Voucher moves directly to `REDEEMED`.

### Payout line item (one per delivered order / completed walk-in, per restaurant)
`PENDING` → `PAID` (included in a processed payout) · or → `REVOKED` (admin pulls it from pending balance before payout; requires a reason note).

---

## 5. Money model

- **Wallet balance** for a restaurant is *derived*, never stored as a single mutable number: it's the sum of `PENDING` payout line items for that restaurant.
- A **payout line item** is created automatically the moment an order is marked `DELIVERED` or a walk‑in is `COMPLETED`, for the credited amount (full voucher value for delivery; `min(voucher, bill)` for walk‑in).
- **Revoke** (admin, pre-payout only): flips a `PENDING` line item to `REVOKED` with a required reason; it drops out of the wallet balance; the restaurant is notified.
- **Process payout** (admin): takes all of a restaurant's current `PENDING` line items, flips them to `PAID`, stamps a payout record (restaurant, total, item count, timestamp, optional reference note) → restaurant's derived balance goes to zero. A paid item can no longer be revoked.
- This append-only design gives a full audit trail (nothing is ever destructively edited) and matches how the real backend's ledger should work later.

---

## 6. Notifications (mocked for MVP)

No real email/WhatsApp sending yet — every "send" writes a row to an in‑app **Notification Log** (visible to admin) showing channel, recipient, subject, and a human-readable summary, so the flows are demonstrable and auditable. Real provider integration (WhatsApp Business API, an email provider) is a later phase.

| Event | Customer | Restaurant | Admin |
|---|---|---|---|
| Voucher issued | Email + WhatsApp: code, menu link, "secret key = your KokoSend username" note | | |
| Delivery order placed | Email + WhatsApp: confirmation | Email: new order | Email |
| Order status: received / dispatched | Email + WhatsApp | | |
| Order delivered | Email + WhatsApp: "delivered — didn't receive it? Report" link | | |
| Order cancelled/rejected | Email + WhatsApp: voucher released, try again | | |
| Walk‑in redeemed | Email + WhatsApp: safety alert ("not you? report") | | |
| Voucher voided by admin | Email + WhatsApp: cancelled, reason if given | | |
| Restaurant invited (incl. resend) | | Email: invite link | |
| Payout processed | | Email: amount paid | |
| Payout item revoked | | Email: reason | |
| Voucher expiring (day 6, optional nice-to-have) | Email + WhatsApp | | |

---

## 7. Pages

Every screen needs **loading**, **empty**, and **error** secondary states unless noted, and must be verified at mobile width.

### 7.0 Landing page
Unchanged intent from v1 — public marketing site selling restaurants on partnering, routing restaurants and admin to their logins. Nav → Hero → How it works → For restaurants → Trust strip → Final CTA → Footer (with tucked-away Admin login).

### 7.1 Customer pages (no login, public)
1. **Menu browse** (`/menu`) — combos from all active restaurants, filterable by restaurant, category, currency. Unavailable combos hidden. Carries the redeem-choice messaging inline (a banner explains you can either check out with a voucher here, or walk into any partner restaurant in person) rather than as its own separate screen.
2. **Combo detail** (`/menu/[id]`) — image, description, restaurant, category; CTA into checkout.
3. **Checkout** (`/checkout/[comboId]`) — a single page, a dynamic sequence of steps depending on what the combo offers: **(a) spice choice** (only if the combo has one), **(b) drink choice** (only if the combo has soda/water options — pick exactly one), **(c) delivery details** (the structured fields above), **(d) verify** code + secret key — last, not first (generic error + attempt-limit/lockout on failure; currency-mismatch message links back to a filtered menu), **(e) confirmation** (order reference + next steps).
4. **Order tracking** (`/track`) — look up by order reference + secret key; shows status timeline; if delivered, a "didn't receive it? report a problem" action is inline on the same page (not a separate screen) and flags a dispute for admin (does not auto-reverse).
5. **Invalid / expired / already‑used / locked voucher** — not a dedicated route; shown as an inline state wherever a voucher is checked (checkout verify step, walk‑in), since there's no longer a per-customer claim link to land on.
6. **How it works / FAQ / Terms / Privacy / Contact** — static content pages.

### 7.2 Admin pages
1. **Login**
2. **Dashboard** — today's voucher counts (issued/reserved/redeemed/expired), pending payout total, recent activity, disputes needing attention.
3. **Restaurants — list** — name, currency, status, wallet balance, redemption count.
4. **Restaurants — create** — name, address, logo (optional), contact person, contact number, contact email (needed for invite), currency.
5. **Restaurant detail** — profile (editable: name, address, logo, contact person/number, currency — currency edits blocked while a payout balance is pending), invite status/resend (rotates the invite token), menu shortcut, wallet, order history, walk-in history, disable/re-enable toggle.
6. **Menu manager** (per restaurant, also linked directly from each card on the restaurants list) — list combos; **Add combo** and **Edit combo** are their own pages (not a modal), sharing one form component: name, short description, category, **required photo upload**, description, optional **spice choice** toggle, optional **soda options** list + **water available** toggle; no price field.
7. **Generate voucher** — full name, phone, email, secret key (KokoSend username), price, currency → confirm dialog ("Are you sure you want to create a voucher for this username?") → on confirm, generates unique code and triggers notifications. Blocks if that secret key already has an active voucher (rule 3).
8. **Vouchers list** — filters (status, currency, date); columns: code, customer, secret key, value, status, created, expires. Row actions: view, resend notification, void.
9. **Voucher detail** — full audit trail (issued → delivery reserved/redeemed or walk-in → expired/void), each with timestamp.
10. **Orders list** — filters (status, restaurant, date); delivery orders.
11. **Order detail** — status timeline, customer + restaurant info, dispute flag if reported.
12. **Walk‑ins list** — restaurant, voucher, bill amount, credited amount, timestamp.
13. **Payouts** — per‑restaurant pending balance; **Process payout** (confirm) action; payout history; **revoke** a pending line item (reason required) with visible discrepancy trail.
14. **Notification log** — every mocked send, filterable by channel/recipient/status.
15. **Audit log** — every sensitive admin action with timestamp.
16. **Settings** — admin contact email (config, not hardcoded in messages), voucher validity window (default 7 days).

### 7.3 Restaurant pages
1. **Accept invite** — from admin's invite link: set password → active.
2. **Login** — active restaurants only.
3. **Disabled notice** — shown if admin has disabled the account.
4. **Dashboard** — new orders, wallet balance snapshot, quick links.
5. **Menu** — read view of admin-managed combos with an **availability toggle** per combo.
6. **Orders inbox** — incoming delivery orders; new-order indicator.
7. **Order detail** — customer + delivery info; status actions (received → dispatched → delivered; or reject with reason).
8. **Walk‑in redeem** — enter voucher code + secret key → verify (shows currency mismatch / not found / already used / expired as relevant) → enter bill amount → complete (credits wallet, forfeits any remainder, fires customer safety alert).
9. **Wallet** — current pending balance, ledger of credits/revocations, payout history.
10. **Profile / settings** — restaurant details (view), change password.

**Screen count (as built):** 1 landing + 6 customer routes (incl. static; several product "screens" above are consolidated into fewer routes as steps/inline states) + 16 admin routes + 10 restaurant routes — 34 routes total.

---

## 8. Data model (types — mock layer, backend-ready shape)

```ts
type Currency = 'NGN' | 'KES' | 'USD'
type VoucherStatus = 'issued' | 'reserved' | 'redeemed' | 'expired' | 'void'
type RestaurantStatus = 'invited' | 'active' | 'disabled'
type OrderStatus = 'placed' | 'received' | 'dispatched' | 'delivered' | 'cancelled' | 'rejected'
type PayoutItemStatus = 'pending' | 'paid' | 'revoked'
type RedeemMethod = 'delivery' | 'walk_in'

interface Restaurant {
  id: string
  name: string
  address: string
  logoUrl: string | null
  contactPerson: string
  contactNumber: string
  contactEmail: string
  currency: Currency
  status: RestaurantStatus
  password: string | null      // set on invite acceptance
  inviteToken: string          // rotated on resend, invalidating the previous link
  invitedAt: string
  activatedAt: string | null
  createdAt: string
}

interface Combo {
  id: string
  restaurantId: string
  name: string                 // e.g. "Family Feast"
  shortDescription: string     // e.g. "2 burgers, fries and 2 drinks"
  description: string
  category: string             // e.g. "Combos" | "Family Meals" | "Lunch Deals"
  imageUrl: string | null      // required at creation; an uploaded photo (data URL in the mock layer), not a pasted URL
  available: boolean           // restaurant-toggled
  spiceOption: boolean         // if true, customer picks spicy/non-spicy at checkout
  sodaOptions: string[]        // admin-named soda choices, e.g. ["Coca-Cola", "Fanta"]
  waterOption: boolean         // if true, water is offered alongside sodaOptions
  createdAt: string
}

interface Voucher {
  id: string
  code: string                 // unique, shown to customer
  customerFullName: string
  customerPhone: string
  customerEmail: string
  secretKey: string            // KokoSend username
  currency: Currency
  amount: number
  status: VoucherStatus
  redeemMethod: RedeemMethod | null
  createdAt: string
  expiresAt: string             // end of day 7
  redeemedAt: string | null
  verifyAttempts: number        // rate-limit counter (code+key checks); surfaced to admin as a lock indicator
  voidReason: string | null     // set when admin voids; also sent to the customer as a notification
  events: VoucherEvent[]
}

interface VoucherEvent {
  type: 'issued' | 'reserved' | 'released' | 'redeemed_delivery' | 'redeemed_walkin' | 'expired' | 'voided'
  at: string
  note?: string
}

type SpiceLevel = 'spicy' | 'non_spicy'
type DropOption = 'door_drop' | 'leave_at_gate'

interface Order {
  id: string
  reference: string             // customer-facing, used with secret key to track
  voucherId: string
  comboId: string
  restaurantId: string
  status: OrderStatus
  spiceLevel: SpiceLevel | null // null when the combo has no spice option
  drinkChoice: string | null    // a soda name, 'Water', or null when the combo has no drink options
  deliveryName: string
  deliveryPhone: string
  deliveryWhatsapp: string
  houseName: string
  houseNumber: string
  floor: string
  landmark: string | null
  dropOption: DropOption
  additionalInfo: string | null
  createdAt: string
  statusHistory: { status: OrderStatus; at: string; note?: string }[]
  disputeReported: boolean
  disputeNote: string | null
}

interface WalkIn {
  id: string
  voucherId: string
  restaurantId: string
  billAmount: number
  creditedAmount: number        // min(voucher.amount, billAmount)
  forfeitedAmount: number       // voucher.amount - creditedAmount; shown to admin, not banked
  createdAt: string
}

interface PayoutItem {
  id: string
  restaurantId: string
  sourceType: 'order' | 'walk_in'
  sourceId: string
  amount: number
  currency: Currency
  status: PayoutItemStatus
  createdAt: string
  revokedAt: string | null
  revokeReason: string | null
  payoutId: string | null
}

interface Payout {
  id: string
  restaurantId: string
  totalAmount: number
  currency: Currency
  itemCount: number
  reference: string | null
  processedAt: string
}

interface Notification {
  id: string
  channel: 'email' | 'whatsapp'
  recipientType: 'customer' | 'restaurant' | 'admin'
  recipient: string
  template: string               // e.g. 'voucher_issued', 'order_delivered', 'walkin_alert'
  subject: string                // shown as the notification's headline in the log
  summary: string                // human-readable body summary shown in the log
  sentAt: string
}

interface AuditLogEntry {
  id: string
  actor: string                  // 'admin' for now; restaurant self-service actions (e.g. invite acceptance) are also logged by name
  action: string                 // e.g. 'voucher.void', 'payout.process', 'payout.revoke', 'restaurant.update'
  targetType: string
  targetId: string
  note?: string
  at: string
}

interface Settings {
  adminEmail: string             // copied on new orders and dispute reports; editable in Admin → Settings
  voucherValidityDays: number    // default 7; editable in Admin → Settings
}
```

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
- Real email/WhatsApp sending (mocked via Notification Log; provider integration is a later phase).
- Real KokoSend secret-key verification against a live KokoSend system (secret key is just matched as entered for now; pluggable verifier for later).
- Restaurant bank details / real payout transfer (payout is a confirm-only status flip for MVP).
- Multi-staff restaurant logins and multi-admin roles (single login each, but audit-logged so this can be added later).
- Delivery fees / service-area restrictions.
- Partial/split voucher redemption (walk-in leftover is forfeited, not banked).
- Live/rotating-QR anti-screenshot upgrade.
