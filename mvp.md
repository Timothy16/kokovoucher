# KokoVoucher — MVP Build Guide

> **KokoVoucher** is a standalone web app (separate from the fintech app) for issuing, claiming, and redeeming fixed‑value restaurant vouchers. It is presented as its own product brand — restaurants join the KokoVoucher network; the underlying fintech is not named on the public site. This document is the single source of truth for building the MVP screens and mock data for the client presentation.

---

## 1. What we're building

An admin issues a fixed‑value restaurant voucher to an eligible customer. The customer claims and activates it **without any account or login**. A partner restaurant verifies and redeems it. Every voucher is single‑use and expires at the **end of the day it was created** (a 24‑hour window).

Eligibility (the "3 transactions in a day" rule) is handled **upstream in the existing fintech admin** and is **out of scope** here — this app starts at "issue a voucher to this person."

### Three user roles
- **Customer** — receives, claims (via OTP), and presents the voucher. Never logs in.
- **Admin** — generates vouchers, approves restaurants, monitors everything.
- **Restaurant** — self‑registers (needs admin approval), then verifies & redeems vouchers.

---

## 2. Core business rules

1. **Currencies:** NGN (₦), KES (KSh), USD ($). Admin picks currency + types the amount per voucher.
2. **Voucher validity:** 24 hours — expires at end of the same calendar day it was created, any day of the week.
3. **Single use:** a voucher can be redeemed **once only**, enforced server‑side (atomic status flip).
4. **Restaurant binding:** each voucher belongs to exactly one restaurant; it is rejected anywhere else.
5. **Restaurant approval:** a restaurant registers → status `pending` → admin approves → status `approved`. Only `approved` restaurants can log in to redeem and appear in the admin's restaurant dropdown.
6. **One per customer per day:** a customer can hold only one voucher per day (across the whole app).
7. **Delivery:** the message sent to the customer contains a **claim link only** — never the redeemable code.
8. **OTP hygiene:** resend cooldown (e.g. 60s) and a wrong‑attempt limit (e.g. 5) on the claim step.

---

## 3. Design system (Drocsid‑inspired: warm, human, trustworthy)

Warm and friendly like Drocsid, tightened slightly on money‑sensitive screens so it reads dependable.

### Colour tokens
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F8F7F4` | app background (warm off‑white) |
| `--surface` | `#FFFFFF` | cards, forms, modals |
| `--primary` | `#2F7D6B` | buttons, links, brand accents |
| `--primary-hover` | `#276657` | button hover |
| `--success` | `#2E9E6B` | valid / redeemed confirmation |
| `--error` | `#D64545` | invalid / expired / already‑used |
| `--warning` | `#E0A43B` | pending / expiring‑soon |
| `--ink` | `#1A1A1A` | primary text / headings |
| `--muted` | `#6B6B6B` | secondary text |
| `--border` | `#E7E4DD` | dividers, input outlines |

### Style
- **Radius:** 12–16px on cards/buttons/inputs; pills for status badges.
- **Shadow:** soft, low‑opacity (e.g. `0 4px 16px rgba(0,0,0,0.06)`).
- **Type:** friendly readable sans‑serif (Inter / Plus Jakarta Sans / system). Clear hierarchy, generous line height.
- **Spacing:** roomy; lots of whitespace; comfortable touch targets for mobile.
- **Microcopy:** warm and human ("You've earned a treat 🎉", "All set — show this at the counter"). Keep money/redemption results crisp and unambiguous.
- **Avatars/illustration:** DiceBear‑style friendly avatars are fine for mock data.

### Status badge colours
`ISSUED` = muted grey · `ACTIVE` = primary green · `REDEEMED` = success · `EXPIRED` = error/muted · `PENDING` (restaurant) = warning · `APPROVED` = success.

---

## 4. Lifecycles (states)

### Voucher
`ISSUED` → `ACTIVE` (customer passed OTP) → `REDEEMED` (restaurant redeemed) · or → `EXPIRED` (24h window passed before redemption).

### Restaurant account
`PENDING` (just registered) → `APPROVED` (admin approved) · or → `REJECTED` (optional, admin declined).

---

## 5. Pages

Every screen needs three secondary states unless noted: **loading**, **empty** ("nothing here yet"), and **error** ("something went wrong, try again").

### 5.0 Landing page (industry‑standard marketing site)

The public front door for **KokoVoucher**. Its audience is **restaurants deciding whether to partner** (primary) and **admins signing in** (secondary). Customers never see it — they arrive via their private claim link. The page's job: sell restaurants on joining, and route both groups to the right door. KokoVoucher stands as its own brand; do not name the underlying fintech here.

Full‑width responsive marketing page, warm Drocsid aesthetic, sections top‑to‑bottom:

1. **Nav bar** — KokoVoucher logo left. Right: anchor links *How it works*, *For restaurants*; then buttons **Restaurant login / register** (primary green) and a quieter **Admin login** (text/ghost).
2. **Hero** — bold headline + subhead + primary CTA. Suggested copy: headline *"Reward loyal customers. Fill your tables."*, subhead *"KokoVoucher turns rewards into real footfall for your restaurant."*, CTA **Become a partner restaurant**. Warm hero visual: a friendly mock voucher/QR card.
3. **How it works** — 3 icon steps: *Customer earns a reward* → *Activates it on their phone* → *Redeems it at your restaurant*. One glance explains the whole flow.
4. **For restaurants** — the value pitch, 3–4 benefit cards: new footfall from a fintech's loyal users; zero setup cost; redeem in seconds from any phone; no hardware needed. Ends with **Register your restaurant** CTA.
5. **Trust / security strip** — short reassurance row: single‑use codes · verified customers · instant confirmation. (Matters because vouchers carry money value.)
6. **Final CTA band** — full‑width colour band: *"Ready to partner with us?"* + **Register your restaurant** button.
7. **Footer** — KokoVoucher logo, links (*Privacy*, *Terms*, *Contact*), copyright, and a small **Admin login** link tucked here as well.

CTAs go to restaurant register/login; the two admin links go to admin login. Keep copy warm and human, benefit numbers as friendly placeholders (not hard promises).

### 5.1 Customer pages (no login)
1. **Claim landing** — from the link. Shows "You earned [amount+currency] at [Restaurant]", expiry note, single **Activate** button.
2. **OTP verification** — enter code sent to phone; resend (with cooldown); attempt‑limit message.
3. **Voucher display** — QR code + short human‑readable code, restaurant name, value, live countdown to expiry. Sub‑states: *active*, *already redeemed*, *expired*.
4. **Invalid / expired link** — friendly fallback when link is bad, already used, or window passed.

### 5.2 Admin pages
1. **Login**
2. **Dashboard** — today's counts: issued / active / redeemed / expired; pending‑restaurant alert; recent activity.
3. **Generate voucher** — form: customer email, customer phone, restaurant (dropdown of *approved* only), currency selector (NGN/KES/USD), amount → send. Success confirmation.
4. **Vouchers list** — table with filters (status, restaurant, currency, date). Columns: code, customer, restaurant, value, status, created. Row action: resend.
5. **Voucher detail** — full audit trail: issued → delivered → activated → redeemed, each with timestamp; who redeemed it.
6. **Restaurants** — list with status. **Approve / reject** actions on pending ones. View restaurant detail (name, email, join date, redemption count).

### 5.3 Restaurant pages
1. **Register** — email, password, restaurant name → lands on a "pending approval" screen.
2. **Pending‑approval notice** — shown while status is `pending`; can't redeem yet.
3. **Login** — approved restaurants only (pending sees the notice).
4. **Redeem** (core screen) — desktop: type voucher number; mobile: **scan QR** or type number. Result: large green ✓ with value, or red ✗ with reason (not found / already redeemed / expired / wrong restaurant).
5. **Redemption history** — list of vouchers this restaurant redeemed, with value + timestamp.
6. **Profile / settings** — restaurant name, change password.

**Screen count:** 1 landing + 4 customer + 6 admin + 6 restaurant.

---

## 6. Mock data (for the MVP presentation)

Use realistic African names and all three currencies. Structure below is a guide — adapt field names to the stack.

### Admin
```json
{ "id": "adm_01", "name": "Admin User", "email": "admin@kokovoucher.app" }
```

### Restaurants
```json
[
  { "id": "rst_01", "name": "Mama Put Kitchen",   "email": "hello@mamaput.ng",     "status": "approved", "joinedAt": "2026-08-20", "redemptions": 42 },
  { "id": "rst_02", "name": "Nairobi Bites",       "email": "team@nairobibites.ke", "status": "approved", "joinedAt": "2026-08-25", "redemptions": 18 },
  { "id": "rst_03", "name": "The Yellow Chilli",   "email": "info@yellowchilli.ng", "status": "pending",  "joinedAt": "2026-09-09", "redemptions": 0 },
  { "id": "rst_04", "name": "Java House",          "email": "hi@javahouse.ke",      "status": "pending",  "joinedAt": "2026-09-10", "redemptions": 0 }
]
```

### Vouchers
```json
[
  { "id": "vch_01", "code": "AF7K-9QX2", "customerEmail": "amaka@example.com",  "customerPhone": "+2348030000001", "restaurantId": "rst_01", "restaurantName": "Mama Put Kitchen", "currency": "NGN", "amount": 5000,  "status": "active",   "createdAt": "2026-09-10T09:00:00", "expiresAt": "2026-09-10T23:59:59", "activatedAt": "2026-09-10T09:12:00", "redeemedAt": null },
  { "id": "vch_02", "code": "KE3M-5PL8", "customerEmail": "wanjiru@example.com","customerPhone": "+254700000002", "restaurantId": "rst_02", "restaurantName": "Nairobi Bites",     "currency": "KES", "amount": 800,   "status": "redeemed", "createdAt": "2026-09-10T10:05:00", "expiresAt": "2026-09-10T23:59:59", "activatedAt": "2026-09-10T10:10:00", "redeemedAt": "2026-09-10T13:40:00" },
  { "id": "vch_03", "code": "US2N-8RT4", "customerEmail": "tunde@example.com",  "customerPhone": "+2348030000003", "restaurantId": "rst_01", "restaurantName": "Mama Put Kitchen", "currency": "USD", "amount": 10,    "status": "issued",   "createdAt": "2026-09-10T11:00:00", "expiresAt": "2026-09-10T23:59:59", "activatedAt": null,               "redeemedAt": null },
  { "id": "vch_04", "code": "NG9J-1WZ7", "customerEmail": "chidi@example.com",  "customerPhone": "+2348030000004", "restaurantId": "rst_02", "restaurantName": "Nairobi Bites",     "currency": "NGN", "amount": 3500,  "status": "expired",  "createdAt": "2026-09-09T18:00:00", "expiresAt": "2026-09-09T23:59:59", "activatedAt": "2026-09-09T18:20:00", "redeemedAt": null }
]
```

### Redemption result shape (restaurant redeem screen)
```json
{ "ok": true,  "voucher": { "code": "KE3M-5PL8", "amount": 800, "currency": "KES", "restaurantName": "Nairobi Bites" } }
{ "ok": false, "reason": "ALREADY_REDEEMED" }   // reasons: NOT_FOUND | ALREADY_REDEEMED | EXPIRED | WRONG_RESTAURANT | NOT_ACTIVE
```

### Admin dashboard summary (today)
```json
{ "issued": 12, "active": 5, "redeemed": 6, "expired": 1, "pendingRestaurants": 2 }
```

### Currency display
| Code | Symbol | Example |
|---|---|---|
| NGN | ₦ | ₦5,000 |
| KES | KSh | KSh 800 |
| USD | $ | $10 |

---

## 7. Out of scope for MVP
- The 3‑transactions eligibility rule (lives in the fintech admin).
- Real email/WhatsApp/OTP sending (mock these in the presentation).
- Payment settlement between client and restaurants.
- The live/rotating‑QR anti‑screenshot upgrade (phase 2 toggle only).
