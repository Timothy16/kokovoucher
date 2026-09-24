// app/composables/useMockDb.ts
// KokoVoucher mock data + service layer (v2).
// This file is the single boundary between the UI and "the backend". Every rule from
// mvp.md is enforced here, not in pages — so pages stay thin and a real API can swap
// this file out later without touching a single .vue file.

export type Currency = 'NGN' | 'KES' | 'USD'
export type VoucherStatus = 'issued' | 'reserved' | 'redeemed' | 'expired' | 'void'
export type RestaurantStatus = 'invited' | 'active' | 'disabled'
export type OrderStatus = 'placed' | 'received' | 'dispatched' | 'delivered' | 'cancelled' | 'rejected'
export type PayoutItemStatus = 'pending' | 'paid' | 'revoked'
export type RedeemMethod = 'delivery' | 'walk_in'
export type NotificationChannel = 'email' | 'whatsapp'
export type NotificationRecipientType = 'customer' | 'restaurant' | 'admin'
export type SpiceLevel = 'spicy' | 'non_spicy'
export type DropOption = 'door_drop' | 'leave_at_gate'

export interface Restaurant {
  id: string
  name: string
  address: string
  logoUrl: string | null
  contactPerson: string
  contactNumber: string
  contactEmail: string
  currency: Currency
  status: RestaurantStatus
  password: string | null
  inviteToken: string
  invitedAt: string
  activatedAt: string | null
  createdAt: string
}

export interface Combo {
  id: string
  restaurantId: string
  name: string
  shortDescription: string
  description: string
  category: string
  imageUrl: string | null
  available: boolean
  spiceOption: boolean        // if true, customer picks spicy/non-spicy at checkout
  sodaOptions: string[]       // admin-named soda choices, e.g. ["Coca-Cola", "Fanta"]
  waterOption: boolean        // if true, water is offered alongside sodaOptions
  createdAt: string
}

export interface VoucherEvent {
  type: 'issued' | 'reserved' | 'released' | 'redeemed_delivery' | 'redeemed_walkin' | 'expired' | 'voided'
  at: string
  note?: string
}

export interface Voucher {
  id: string
  code: string
  customerFullName: string
  customerPhone: string
  customerEmail: string
  secretKey: string
  currency: Currency
  amount: number
  status: VoucherStatus
  redeemMethod: RedeemMethod | null
  createdAt: string
  expiresAt: string
  redeemedAt: string | null
  verifyAttempts: number
  voidReason: string | null
  events: VoucherEvent[]
}

export interface Order {
  id: string
  reference: string
  voucherId: string
  comboId: string
  restaurantId: string
  status: OrderStatus
  spiceLevel: SpiceLevel | null     // null when the combo has no spice option
  drinkChoice: string | null        // a soda name, 'Water', or null when the combo has no drink options
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

export interface WalkIn {
  id: string
  voucherId: string
  restaurantId: string
  billAmount: number
  creditedAmount: number
  forfeitedAmount: number
  createdAt: string
}

export interface PayoutItem {
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

export interface Payout {
  id: string
  restaurantId: string
  totalAmount: number
  currency: Currency
  itemCount: number
  reference: string | null
  processedAt: string
}

export interface Notification {
  id: string
  channel: NotificationChannel
  recipientType: NotificationRecipientType
  recipient: string
  template: string
  subject: string
  summary: string
  sentAt: string
}

export interface AuditLogEntry {
  id: string
  actor: string
  action: string
  targetType: string
  targetId: string
  note?: string
  at: string
}

export type VerifyReason = 'NOT_FOUND' | 'LOCKED' | 'WRONG_CREDENTIALS' | 'EXPIRED' | 'ALREADY_USED' | 'NOT_AVAILABLE'
export type OrderActionReason = 'CURRENCY_MISMATCH' | 'COMBO_UNAVAILABLE' | 'RESTAURANT_UNAVAILABLE' | 'VOUCHER_NOT_AVAILABLE' | 'SPICE_LEVEL_REQUIRED' | 'DRINK_CHOICE_REQUIRED'
export type LoginReason = 'INVALID' | 'DISABLED' | 'NOT_ACTIVATED'

interface Session {
  role: 'admin' | 'restaurant' | null
  restaurantId: string | null
}

interface Settings {
  adminEmail: string
  voucherValidityDays: number
}

interface Db {
  schemaVersion: number
  admin: { id: string; name: string; email: string; password: string }
  settings: Settings
  restaurants: Restaurant[]
  combos: Combo[]
  vouchers: Voucher[]
  orders: Order[]
  walkIns: WalkIn[]
  payoutItems: PayoutItem[]
  payouts: Payout[]
  notifications: Notification[]
  auditLog: AuditLogEntry[]
  session: Session
}

const STORAGE_KEY = 'kokovoucher-db-v2'
// Bump this whenever a field is added/removed/renamed on any interface above.
// loadDb() discards any cached browser data that doesn't match, instead of trying
// to run the app against a stale shape (that's what silently broke ComboCard etc.
// when sodaOptions/waterOption/spiceOption were added without a version bump).
const SCHEMA_VERSION = 3
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const VERIFY_MAX_ATTEMPTS = 5

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

function randomPart(len: number) {
  return Array.from({ length: len }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
}

function randomVoucherCode() {
  return `${randomPart(4)}-${randomPart(4)}`
}

function randomInviteToken() {
  return Array.from({ length: 28 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('').toLowerCase()
}

function randomOrderReference() {
  return `KV-${randomPart(6)}`
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase()
}

/** End of day N (N=voucher validity days) after createdAt, e.g. createdAt=day1, N=7 -> 23:59:59 on day 7 (createdAt + 6 days). */
function endOfValidityWindow(fromISO: string, days: number) {
  const d = new Date(fromISO)
  d.setDate(d.getDate() + (days - 1))
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function daysAgoISO(days: number, hour = 12) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function isSameCalendarDay(aISO: string, bISO: string) {
  const a = new Date(aISO)
  const b = new Date(bISO)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function seedDb(): Db {
  const validityDays = 7

  const restaurants: Restaurant[] = [
    {
      id: 'rst_01', name: 'Mama Put Kitchen', address: '14 Adeola Odeku St, Victoria Island, Lagos', logoUrl: null,
      contactPerson: 'Ngozi Eze', contactNumber: '+2348030000010', contactEmail: 'hello@mamaput.ng',
      currency: 'NGN', status: 'active', password: 'restaurant123', inviteToken: randomInviteToken(),
      invitedAt: daysAgoISO(30), activatedAt: daysAgoISO(29), createdAt: daysAgoISO(30)
    },
    {
      id: 'rst_02', name: 'Nairobi Bites', address: 'Kimathi Street, Nairobi CBD', logoUrl: null,
      contactPerson: 'Wanjiku Kamau', contactNumber: '+254700000020', contactEmail: 'team@nairobibites.ke',
      currency: 'KES', status: 'active', password: 'restaurant123', inviteToken: randomInviteToken(),
      invitedAt: daysAgoISO(25), activatedAt: daysAgoISO(24), createdAt: daysAgoISO(25)
    },
    {
      id: 'rst_03', name: 'The Yellow Chilli', address: '9 Allen Avenue, Ikeja, Lagos', logoUrl: null,
      contactPerson: 'Tunde Bakare', contactNumber: '+2348030000030', contactEmail: 'info@yellowchilli.ng',
      currency: 'NGN', status: 'invited', password: null, inviteToken: randomInviteToken(),
      invitedAt: daysAgoISO(2), activatedAt: null, createdAt: daysAgoISO(2)
    },
    {
      id: 'rst_04', name: 'Java House', address: 'Moi Avenue, Mombasa', logoUrl: null,
      contactPerson: 'Amina Hassan', contactNumber: '+254700000040', contactEmail: 'hi@javahouse.ke',
      currency: 'KES', status: 'disabled', password: 'restaurant123', inviteToken: randomInviteToken(),
      invitedAt: daysAgoISO(40), activatedAt: daysAgoISO(39), createdAt: daysAgoISO(40)
    },
    {
      id: 'rst_05', name: 'Diaspora Grill', address: '221 Bedford Ave, Brooklyn, NY', logoUrl: null,
      contactPerson: 'Kwame Owusu', contactNumber: '+13475550005', contactEmail: 'orders@diasporagrill.us',
      currency: 'USD', status: 'active', password: 'restaurant123', inviteToken: randomInviteToken(),
      invitedAt: daysAgoISO(15), activatedAt: daysAgoISO(14), createdAt: daysAgoISO(15)
    }
  ]

  const combos: Combo[] = [
    { id: 'cmb_01', restaurantId: 'rst_01', name: 'Family Feast', shortDescription: '2 burgers, fries and 2 drinks', description: 'A generous spread for two — juicy beef burgers, crispy fries and two chilled soft drinks.', category: 'Family Meals', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', available: true, spiceOption: false, sodaOptions: ['Coca-Cola', 'Fanta', 'Sprite'], waterOption: true, createdAt: daysAgoISO(28) },
    { id: 'cmb_02', restaurantId: 'rst_01', name: 'Jollof Lunch Special', shortDescription: 'Jollof rice, grilled chicken, plantain', description: 'Smoky party jollof rice with grilled chicken thigh and sweet fried plantain.', category: 'Lunch Deals', imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80', available: true, spiceOption: true, sodaOptions: ['Coca-Cola', 'Fanta'], waterOption: true, createdAt: daysAgoISO(28) },
    { id: 'cmb_03', restaurantId: 'rst_01', name: 'Suya Combo', shortDescription: 'Beef suya, onions, pepper sauce', description: 'Spicy grilled beef suya skewers with fresh onions and our house pepper sauce.', category: 'Combos', imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80', available: false, spiceOption: true, sodaOptions: ['Coca-Cola'], waterOption: true, createdAt: daysAgoISO(20) },
    { id: 'cmb_04', restaurantId: 'rst_02', name: 'Nyama Choma Platter', shortDescription: 'Grilled beef, ugali, kachumbari', description: 'Char-grilled beef served with soft ugali and a fresh tomato-onion kachumbari.', category: 'Combos', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80', available: true, spiceOption: true, sodaOptions: ['Coca-Cola', 'Stoney Tangawizi'], waterOption: true, createdAt: daysAgoISO(23) },
    { id: 'cmb_05', restaurantId: 'rst_02', name: 'Pilau Lunch', shortDescription: 'Spiced pilau rice with beef stew', description: 'Fragrant spiced pilau rice slow-cooked with tender beef stew.', category: 'Lunch Deals', imageUrl: 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=800&q=80', available: true, spiceOption: false, sodaOptions: ['Coca-Cola', 'Sprite'], waterOption: true, createdAt: daysAgoISO(23) },
    { id: 'cmb_06', restaurantId: 'rst_05', name: 'Jollof & Jerk Plate', shortDescription: 'Jerk chicken, jollof rice, slaw', description: 'Smoky jerk chicken over party jollof rice with a side of tangy slaw.', category: 'Combos', imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80', available: true, spiceOption: true, sodaOptions: ['Coca-Cola', 'Ginger Beer'], waterOption: true, createdAt: daysAgoISO(13) },
    { id: 'cmb_07', restaurantId: 'rst_05', name: 'Weekday Lunch Box', shortDescription: 'Fried rice, chicken wings, plantain', description: 'A quick, filling lunch box of fried rice, crispy wings and plantain.', category: 'Lunch Deals', imageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80', available: true, spiceOption: false, sodaOptions: ['Coca-Cola', 'Sprite'], waterOption: true, createdAt: daysAgoISO(13) }
  ]

  const vouchers: Voucher[] = []
  const orders: Order[] = []
  const walkIns: WalkIn[] = []
  const payoutItems: PayoutItem[] = []
  const payouts: Payout[] = []
  const notifications: Notification[] = []
  const auditLog: AuditLogEntry[] = []

  function pushNotification(n: Omit<Notification, 'id'>) {
    notifications.push({ id: uid('ntf'), ...n })
  }
  function pushAudit(a: Omit<AuditLogEntry, 'id'>) {
    auditLog.push({ id: uid('adt'), ...a })
  }

  function mkVoucher(over: Pick<Voucher, 'customerFullName' | 'customerPhone' | 'customerEmail' | 'secretKey' | 'currency' | 'amount'>, createdAtISO: string, status: VoucherStatus): Voucher {
    const createdAt = createdAtISO
    const v: Voucher = {
      id: uid('vch'),
      code: randomVoucherCode(),
      status: 'issued',
      redeemMethod: null,
      createdAt,
      expiresAt: endOfValidityWindow(createdAt, validityDays),
      redeemedAt: null,
      verifyAttempts: 0,
      voidReason: null,
      events: [{ type: 'issued', at: createdAt }],
      ...over
    }
    pushNotification({
      channel: 'email', recipientType: 'customer', recipient: v.customerEmail, template: 'voucher_issued',
      subject: `You've got a KokoVoucher — ${formatCurrency(v.amount, v.currency)}`,
      summary: `Code ${v.code} sent with menu link. Secret key = KokoSend username.`, sentAt: createdAt
    })
    pushNotification({
      channel: 'whatsapp', recipientType: 'customer', recipient: v.customerPhone, template: 'voucher_issued',
      subject: `You've got a KokoVoucher — ${formatCurrency(v.amount, v.currency)}`,
      summary: `Code ${v.code} sent with menu link. Secret key = KokoSend username.`, sentAt: createdAt
    })
    pushAudit({ actor: 'admin', action: 'voucher.issue', targetType: 'voucher', targetId: v.id, note: `${formatCurrency(v.amount, v.currency)} to ${v.secretKey}`, at: createdAt })
    if (status === 'issued') return v
    v.status = status
    return v
  }

  // 1) issued, untouched, plenty of time left
  vouchers.push(mkVoucher({ customerFullName: 'Amaka Obi', customerPhone: '+2348030000001', customerEmail: 'amaka@example.com', secretKey: 'amaka_okoro', currency: 'NGN', amount: 5000 }, daysAgoISO(1), 'issued'))

  // 2) reserved — has an active delivery order in flight
  {
    const v = mkVoucher({ customerFullName: 'Tunde Balogun', customerPhone: '+2348030000003', customerEmail: 'tunde@example.com', secretKey: 'tunde_b', currency: 'NGN', amount: 6000 }, daysAgoISO(2), 'issued')
    v.status = 'reserved'
    v.redeemMethod = 'delivery'
    v.events.push({ type: 'reserved', at: daysAgoISO(1) })
    vouchers.push(v)
    const order: Order = {
      id: uid('ord'), reference: randomOrderReference(), voucherId: v.id, comboId: 'cmb_02', restaurantId: 'rst_01',
      status: 'dispatched', spiceLevel: 'spicy', drinkChoice: 'Coca-Cola',
      deliveryName: 'Tunde Balogun', deliveryPhone: v.customerPhone, deliveryWhatsapp: v.customerPhone,
      houseName: 'Herbert Macaulay Court', houseNumber: '22', floor: '3rd', landmark: 'Opposite Yaba Market', dropOption: 'door_drop', additionalInfo: null,
      createdAt: daysAgoISO(1),
      statusHistory: [
        { status: 'placed', at: daysAgoISO(1) },
        { status: 'received', at: daysAgoISO(1) },
        { status: 'dispatched', at: daysAgoISO(0) }
      ],
      disputeReported: false, disputeNote: null
    }
    orders.push(order)
    pushNotification({ channel: 'email', recipientType: 'customer', recipient: v.customerEmail, template: 'order_placed', subject: 'Order confirmed', summary: `Order ${order.reference} placed at Mama Put Kitchen.`, sentAt: daysAgoISO(1) })
    pushNotification({ channel: 'email', recipientType: 'restaurant', recipient: 'hello@mamaput.ng', template: 'order_placed', subject: 'New delivery order', summary: `New order ${order.reference} — Jollof Lunch Special.`, sentAt: daysAgoISO(1) })
    pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: v.customerPhone, template: 'order_dispatched', subject: 'Order dispatched', summary: `Order ${order.reference} is on its way.`, sentAt: daysAgoISO(0) })
  }

  // 3) redeemed via delivery — full happy path, wallet credited
  {
    const v = mkVoucher({ customerFullName: 'Wanjiru Kamau', customerPhone: '+254700000002', customerEmail: 'wanjiru@example.com', secretKey: 'wanjiru_k', currency: 'KES', amount: 800 }, daysAgoISO(4), 'issued')
    v.status = 'redeemed'
    v.redeemMethod = 'delivery'
    v.redeemedAt = daysAgoISO(3)
    v.events.push({ type: 'reserved', at: daysAgoISO(4) }, { type: 'redeemed_delivery', at: daysAgoISO(3) })
    vouchers.push(v)
    const order: Order = {
      id: uid('ord'), reference: randomOrderReference(), voucherId: v.id, comboId: 'cmb_04', restaurantId: 'rst_02',
      status: 'delivered', spiceLevel: 'non_spicy', drinkChoice: 'Water',
      deliveryName: 'Wanjiru Kamau', deliveryPhone: v.customerPhone, deliveryWhatsapp: v.customerPhone,
      houseName: 'Ngong Court Apartments', houseNumber: '14', floor: 'Ground', landmark: null, dropOption: 'leave_at_gate', additionalInfo: 'Call on arrival, gate code 4521.',
      createdAt: daysAgoISO(4),
      statusHistory: [
        { status: 'placed', at: daysAgoISO(4) },
        { status: 'received', at: daysAgoISO(4) },
        { status: 'dispatched', at: daysAgoISO(3) },
        { status: 'delivered', at: daysAgoISO(3) }
      ],
      disputeReported: false, disputeNote: null
    }
    orders.push(order)
    const item: PayoutItem = { id: uid('pyi'), restaurantId: 'rst_02', sourceType: 'order', sourceId: order.id, amount: v.amount, currency: v.currency, status: 'pending', createdAt: daysAgoISO(3), revokedAt: null, revokeReason: null, payoutId: null }
    payoutItems.push(item)
    pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: v.customerPhone, template: 'order_delivered', subject: 'Delivered!', summary: `Order ${order.reference} delivered. Didn't receive it? Report a problem.`, sentAt: daysAgoISO(3) })
  }

  // 4) redeemed via walk-in — bill was less than voucher, leftover forfeited, already paid out
  {
    const v = mkVoucher({ customerFullName: 'Chidi Nwosu', customerPhone: '+2348030000004', customerEmail: 'chidi@example.com', secretKey: 'chidi_n', currency: 'NGN', amount: 3500 }, daysAgoISO(9), 'issued')
    v.status = 'redeemed'
    v.redeemMethod = 'walk_in'
    v.redeemedAt = daysAgoISO(8)
    v.events.push({ type: 'redeemed_walkin', at: daysAgoISO(8) })
    vouchers.push(v)
    const walkIn: WalkIn = { id: uid('wlk'), voucherId: v.id, restaurantId: 'rst_01', billAmount: 2200, creditedAmount: 2200, forfeitedAmount: 1300, createdAt: daysAgoISO(8) }
    walkIns.push(walkIn)
    const payout: Payout = { id: uid('pyo'), restaurantId: 'rst_01', totalAmount: 2200, currency: 'NGN', itemCount: 1, reference: 'Bank transfer 07/09', processedAt: daysAgoISO(5) }
    payouts.push(payout)
    const item: PayoutItem = { id: uid('pyi'), restaurantId: 'rst_01', sourceType: 'walk_in', sourceId: walkIn.id, amount: 2200, currency: 'NGN', status: 'paid', createdAt: daysAgoISO(8), revokedAt: null, revokeReason: null, payoutId: payout.id }
    payoutItems.push(item)
    pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: v.customerPhone, template: 'walkin_alert', subject: 'Voucher redeemed', summary: '₦2,200 redeemed at Mama Put Kitchen. Not you? Report it.', sentAt: daysAgoISO(8) })
    pushNotification({ channel: 'email', recipientType: 'restaurant', recipient: 'hello@mamaput.ng', template: 'payout_processed', subject: 'Payout processed', summary: `₦2,200 paid out — ref: Bank transfer 07/09.`, sentAt: daysAgoISO(5) })
    pushAudit({ actor: 'admin', action: 'payout.process', targetType: 'restaurant', targetId: 'rst_01', note: '₦2,200 — 1 item', at: daysAgoISO(5) })
  }

  // 5) revoked payout item — restaurant claimed delivered, admin found a discrepancy before paying
  {
    const v = mkVoucher({ customerFullName: 'Femi Adeyemi', customerPhone: '+2348030000006', customerEmail: 'femi@example.com', secretKey: 'femi_a', currency: 'NGN', amount: 4500 }, daysAgoISO(6), 'issued')
    v.status = 'redeemed'
    v.redeemMethod = 'delivery'
    v.redeemedAt = daysAgoISO(5)
    v.events.push({ type: 'reserved', at: daysAgoISO(6) }, { type: 'redeemed_delivery', at: daysAgoISO(5) })
    vouchers.push(v)
    const order: Order = {
      id: uid('ord'), reference: randomOrderReference(), voucherId: v.id, comboId: 'cmb_02', restaurantId: 'rst_01',
      status: 'delivered', spiceLevel: 'spicy', drinkChoice: 'Fanta',
      deliveryName: 'Femi Adeyemi', deliveryPhone: v.customerPhone, deliveryWhatsapp: v.customerPhone,
      houseName: 'Bourdillon Heights', houseNumber: '5', floor: '2nd', landmark: 'Near Ikoyi Club', dropOption: 'door_drop', additionalInfo: null,
      createdAt: daysAgoISO(6),
      statusHistory: [
        { status: 'placed', at: daysAgoISO(6) },
        { status: 'received', at: daysAgoISO(6) },
        { status: 'dispatched', at: daysAgoISO(5) },
        { status: 'delivered', at: daysAgoISO(5) }
      ],
      disputeReported: true, disputeNote: 'Customer says the order never arrived, despite being marked delivered.'
    }
    orders.push(order)
    const item: PayoutItem = { id: uid('pyi'), restaurantId: 'rst_01', sourceType: 'order', sourceId: order.id, amount: v.amount, currency: v.currency, status: 'revoked', createdAt: daysAgoISO(5), revokedAt: daysAgoISO(4), revokeReason: 'Customer reported non-delivery; restaurant could not provide proof of delivery.', payoutId: null }
    payoutItems.push(item)
    pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: v.customerPhone, template: 'order_delivered', subject: 'Delivered!', summary: `Order ${order.reference} delivered. Didn't receive it? Report a problem.`, sentAt: daysAgoISO(5) })
    pushNotification({ channel: 'email', recipientType: 'restaurant', recipient: 'hello@mamaput.ng', template: 'payout_revoked', subject: 'Payout item revoked', summary: 'A pending credit was revoked — see reason in your wallet.', sentAt: daysAgoISO(4) })
    pushAudit({ actor: 'admin', action: 'payout.revoke', targetType: 'payout_item', targetId: item.id, note: item.revokeReason ?? undefined, at: daysAgoISO(4) })
  }

  // 6) expired — never redeemed
  {
    const v = mkVoucher({ customerFullName: 'Grace Muthoni', customerPhone: '+254700000007', customerEmail: 'grace@example.com', secretKey: 'grace_m', currency: 'KES', amount: 1000 }, daysAgoISO(10), 'issued')
    v.status = 'expired'
    v.events.push({ type: 'expired', at: daysAgoISO(3) })
    vouchers.push(v)
  }

  // 7) voided by admin (wrong secret key at issue time)
  {
    const v = mkVoucher({ customerFullName: 'Ifeoma Chukwu', customerPhone: '+2348030000008', customerEmail: 'ifeoma@example.com', secretKey: 'ifeoma_c', currency: 'NGN', amount: 2500 }, daysAgoISO(1), 'issued')
    v.status = 'void'
    v.voidReason = 'Issued with a mistyped secret key; reissued correctly.'
    v.events.push({ type: 'voided', at: daysAgoISO(1), note: v.voidReason })
    vouchers.push(v)
    pushAudit({ actor: 'admin', action: 'voucher.void', targetType: 'voucher', targetId: v.id, note: v.voidReason, at: daysAgoISO(1) })
  }

  // 8) fresh issued voucher for USD restaurant — used for live demo of walk-in / delivery flows
  vouchers.push(mkVoucher({ customerFullName: 'Kwabena Mensah', customerPhone: '+13475550009', customerEmail: 'kwabena@example.com', secretKey: 'kwabena_m', currency: 'USD', amount: 25 }, daysAgoISO(0), 'issued'))

  // Invite notification + audit for the still-invited restaurant
  pushNotification({ channel: 'email', recipientType: 'restaurant', recipient: 'info@yellowchilli.ng', template: 'restaurant_invited', subject: "You're invited to join KokoVoucher", summary: 'Invite link sent to set a password and go live.', sentAt: daysAgoISO(2) })
  pushAudit({ actor: 'admin', action: 'restaurant.create', targetType: 'restaurant', targetId: 'rst_03', note: 'Invited The Yellow Chilli', at: daysAgoISO(2) })

  return {
    schemaVersion: SCHEMA_VERSION,
    admin: { id: 'adm_01', name: 'Admin User', email: 'admin@kokovoucher.app', password: 'admin123' },
    settings: { adminEmail: 'admin@kokovoucher.app', voucherValidityDays: validityDays },
    restaurants,
    combos,
    vouchers,
    orders,
    walkIns,
    payoutItems,
    payouts,
    notifications: notifications.sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt)),
    auditLog: auditLog.sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    session: { role: null, restaurantId: null }
  }
}

function loadDb(): Db {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Db
        if (parsed.schemaVersion === SCHEMA_VERSION) return parsed
        // Stale shape from an earlier build — don't run the app against data
        // that's missing fields the current code assumes exist. Fresh seed instead.
      }
    } catch {
      // fall through to fresh seed
    }
  }
  return seedDb()
}

export function computeEffectiveVoucherStatus(voucher: Voucher): VoucherStatus {
  if ((voucher.status === 'issued' || voucher.status === 'reserved') && Date.now() > new Date(voucher.expiresAt).getTime()) {
    return 'expired'
  }
  return voucher.status
}

export function formatCurrency(amount: number, currency: Currency) {
  const symbols: Record<Currency, string> = { NGN: '₦', KES: 'KSh ', USD: '$' }
  return `${symbols[currency]}${amount.toLocaleString('en-US')}`
}

/** Composes the structured delivery fields into one readable line for admin/restaurant/customer display. */
export function formatOrderAddress(order: Pick<Order, 'houseName' | 'houseNumber' | 'floor' | 'landmark'>) {
  const parts = [order.houseName, `House ${order.houseNumber}`, `Floor ${order.floor}`]
  if (order.landmark) parts.push(`near ${order.landmark}`)
  return parts.filter(Boolean).join(', ')
}

export const DROP_OPTION_LABEL: Record<DropOption, string> = { door_drop: 'Door drop', leave_at_gate: 'Leave at the gate' }

export const ORDER_STATUS_FLOW: OrderStatus[] = ['placed', 'received', 'dispatched', 'delivered']

export function useMockDb() {
  const db = useState<Db>('kokovoucher-db', loadDb)

  if (import.meta.client) {
    const persisted = useState('kokovoucher-db-persist-wired', () => false)
    if (!persisted.value) {
      persisted.value = true
      watch(
        db,
        (val) => {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
          } catch {
            // storage unavailable — demo continues in-memory
          }
        },
        { deep: true }
      )
      window.setInterval(() => {
        let changed = false
        for (const v of db.value.vouchers) {
          if ((v.status === 'issued' || v.status === 'reserved') && computeEffectiveVoucherStatus(v) === 'expired') {
            v.status = 'expired'
            v.events.push({ type: 'expired', at: new Date().toISOString() })
            changed = true
          }
        }
        if (changed) db.value = { ...db.value }
      }, 15000)
    }
  }

  // ---------- helpers ----------
  function pushNotification(n: Omit<Notification, 'id' | 'sentAt'>) {
    db.value.notifications.unshift({ id: uid('ntf'), sentAt: new Date().toISOString(), ...n })
  }
  function pushAudit(a: Omit<AuditLogEntry, 'id' | 'at'>) {
    db.value.auditLog.unshift({ id: uid('adt'), at: new Date().toISOString(), ...a })
  }

  // ---------- session / identity ----------
  const session = computed(() => db.value.session)
  const currentRestaurant = computed<Restaurant | null>(() => {
    if (session.value.role !== 'restaurant' || !session.value.restaurantId) return null
    return db.value.restaurants.find((r) => r.id === session.value.restaurantId) ?? null
  })
  const activeRestaurants = computed(() => db.value.restaurants.filter((r) => r.status === 'active'))

  function loginAdmin(email: string, password: string) {
    const ok = db.value.admin.email.toLowerCase() === email.trim().toLowerCase() && db.value.admin.password === password
    if (ok) db.value.session = { role: 'admin', restaurantId: null }
    return ok
  }

  function loginRestaurant(email: string, password: string): { ok: boolean; reason?: LoginReason; restaurant?: Restaurant } {
    const restaurant = db.value.restaurants.find((r) => r.contactEmail.toLowerCase() === email.trim().toLowerCase())
    if (!restaurant || restaurant.status === 'invited' || !restaurant.password || restaurant.password !== password) {
      if (restaurant && restaurant.status === 'invited') return { ok: false, reason: 'NOT_ACTIVATED', restaurant }
      return { ok: false, reason: 'INVALID' }
    }
    if (restaurant.status === 'disabled') return { ok: false, reason: 'DISABLED', restaurant }
    db.value.session = { role: 'restaurant', restaurantId: restaurant.id }
    return { ok: true, restaurant }
  }

  function logout() {
    db.value.session = { role: null, restaurantId: null }
  }

  // ---------- restaurants ----------
  function getRestaurant(id: string) {
    return db.value.restaurants.find((r) => r.id === id)
  }
  function getRestaurantByInviteToken(token: string) {
    return db.value.restaurants.find((r) => r.inviteToken === token)
  }

  function createRestaurant(input: {
    name: string; address: string; logoUrl?: string | null; contactPerson: string; contactNumber: string; contactEmail: string; currency: Currency
  }): { ok: boolean; error?: string; restaurant?: Restaurant } {
    const contactEmail = input.contactEmail.trim().toLowerCase()
    if (db.value.restaurants.some((r) => r.contactEmail.toLowerCase() === contactEmail)) {
      return { ok: false, error: 'A restaurant with this contact email already exists.' }
    }
    const restaurant: Restaurant = {
      id: uid('rst'),
      name: input.name.trim(),
      address: input.address.trim(),
      logoUrl: input.logoUrl?.trim() || null,
      contactPerson: input.contactPerson.trim(),
      contactNumber: input.contactNumber.trim(),
      contactEmail,
      currency: input.currency,
      status: 'invited',
      password: null,
      inviteToken: randomInviteToken(),
      invitedAt: new Date().toISOString(),
      activatedAt: null,
      createdAt: new Date().toISOString()
    }
    db.value.restaurants.push(restaurant)
    pushNotification({
      channel: 'email', recipientType: 'restaurant', recipient: restaurant.contactEmail, template: 'restaurant_invited',
      subject: "You're invited to join KokoVoucher", summary: `Invite link sent to ${restaurant.contactPerson} to set a password and go live.`
    })
    pushAudit({ actor: 'admin', action: 'restaurant.create', targetType: 'restaurant', targetId: restaurant.id, note: `Invited ${restaurant.name}` })
    return { ok: true, restaurant }
  }

  function updateRestaurant(id: string, patch: Partial<Pick<Restaurant, 'name' | 'address' | 'logoUrl' | 'contactPerson' | 'contactNumber' | 'currency'>>): { ok: boolean; error?: string } {
    const r = getRestaurant(id)
    if (!r) return { ok: false, error: 'Restaurant not found.' }
    // The pending-payout ledger assumes one currency per restaurant (every payout item inherits the
    // voucher's currency, which was only ever matched against the restaurant's currency at redemption
    // time). Changing currency with money still owed would silently mix currencies in that balance —
    // block it until the restaurant is paid out to zero.
    if (patch.currency && patch.currency !== r.currency && pendingBalance(id) > 0) {
      return { ok: false, error: `${r.name} has a pending payout balance in ${r.currency}. Process that payout before changing currency.` }
    }
    Object.assign(r, patch)
    pushAudit({ actor: 'admin', action: 'restaurant.update', targetType: 'restaurant', targetId: id })
    return { ok: true }
  }

  function resendInvite(id: string) {
    const r = getRestaurant(id)
    if (!r || r.status !== 'invited') return { ok: false }
    // Issue a fresh token so a previously shared/leaked invite link stops working.
    r.inviteToken = randomInviteToken()
    pushNotification({
      channel: 'email', recipientType: 'restaurant', recipient: r.contactEmail, template: 'restaurant_invited',
      subject: "You're invited to join KokoVoucher", summary: `Invite link resent to ${r.contactPerson}. Previous invite link is no longer valid.`
    })
    pushAudit({ actor: 'admin', action: 'restaurant.invite_resend', targetType: 'restaurant', targetId: id })
    return { ok: true }
  }

  function acceptInvite(token: string, password: string): { ok: boolean; error?: string; restaurant?: Restaurant } {
    const restaurant = getRestaurantByInviteToken(token)
    if (!restaurant) return { ok: false, error: 'This invite link is invalid.' }
    if (restaurant.status !== 'invited') return { ok: false, error: 'This invite has already been used.' }
    restaurant.password = password
    restaurant.status = 'active'
    restaurant.activatedAt = new Date().toISOString()
    db.value.session = { role: 'restaurant', restaurantId: restaurant.id }
    pushAudit({ actor: restaurant.name, action: 'restaurant.invite_accept', targetType: 'restaurant', targetId: restaurant.id })
    return { ok: true, restaurant }
  }

  function disableRestaurant(id: string) {
    const r = getRestaurant(id)
    if (!r) return
    r.status = 'disabled'
    // In-flight delivery orders can no longer be fulfilled once the restaurant is locked out —
    // release each one so its voucher doesn't get stuck reserved forever, and the customer knows.
    const openOrders = db.value.orders.filter(
      (o) => o.restaurantId === id && (o.status === 'placed' || o.status === 'received' || o.status === 'dispatched')
    )
    for (const o of openOrders) {
      updateOrderStatus(o.id, 'cancelled', 'Restaurant was disabled by admin before this order could be fulfilled.')
    }
    pushAudit({ actor: 'admin', action: 'restaurant.disable', targetType: 'restaurant', targetId: id, note: `${r.name}${openOrders.length ? ` — released ${openOrders.length} in-flight order${openOrders.length === 1 ? '' : 's'}` : ''}` })
  }

  function enableRestaurant(id: string) {
    const r = getRestaurant(id)
    if (!r) return
    r.status = 'active'
    pushAudit({ actor: 'admin', action: 'restaurant.enable', targetType: 'restaurant', targetId: id, note: r.name })
  }

  // ---------- menu ----------
  function combosByRestaurant(restaurantId: string) {
    return computed(() => db.value.combos.filter((c) => c.restaurantId === restaurantId))
  }

  function createCombo(input: {
    restaurantId: string; name: string; shortDescription: string; description: string; category: string; imageUrl?: string | null
    spiceOption?: boolean; sodaOptions?: string[]; waterOption?: boolean
  }) {
    const combo: Combo = {
      id: uid('cmb'),
      restaurantId: input.restaurantId,
      name: input.name.trim(),
      shortDescription: input.shortDescription.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      imageUrl: input.imageUrl?.trim() || null,
      available: true,
      spiceOption: input.spiceOption ?? false,
      sodaOptions: (input.sodaOptions ?? []).map((s) => s.trim()).filter(Boolean),
      waterOption: input.waterOption ?? false,
      createdAt: new Date().toISOString()
    }
    db.value.combos.push(combo)
    pushAudit({ actor: 'admin', action: 'combo.create', targetType: 'combo', targetId: combo.id, note: combo.name })
    return combo
  }

  function updateCombo(id: string, patch: Partial<Pick<Combo, 'name' | 'shortDescription' | 'description' | 'category' | 'imageUrl' | 'spiceOption' | 'sodaOptions' | 'waterOption'>>) {
    const c = db.value.combos.find((x) => x.id === id)
    if (!c) return { ok: false }
    Object.assign(c, patch)
    pushAudit({ actor: 'admin', action: 'combo.update', targetType: 'combo', targetId: id })
    return { ok: true }
  }

  function toggleComboAvailability(id: string) {
    const c = db.value.combos.find((x) => x.id === id)
    if (!c) return
    c.available = !c.available
  }

  /** Public menu: combos from active restaurants only, restaurant-toggled available only. */
  const publicMenu = computed(() =>
    db.value.combos
      .filter((c) => c.available)
      .map((c) => ({ combo: c, restaurant: db.value.restaurants.find((r) => r.id === c.restaurantId) }))
      .filter((row): row is { combo: Combo; restaurant: Restaurant } => !!row.restaurant && row.restaurant.status === 'active')
  )

  // ---------- vouchers ----------
  function getVoucher(idOrCode: string): Voucher | undefined {
    return db.value.vouchers.find((v) => v.id === idOrCode || v.code.toUpperCase() === idOrCode.toUpperCase())
  }

  function hasActiveVoucher(secretKey: string) {
    const key = normalizeKey(secretKey)
    return db.value.vouchers.some((v) => normalizeKey(v.secretKey) === key && (v.status === 'issued' || v.status === 'reserved') && computeEffectiveVoucherStatus(v) !== 'expired')
  }

  function generateVoucher(input: {
    customerFullName: string; customerPhone: string; customerEmail: string; secretKey: string; currency: Currency; amount: number
  }): { ok: boolean; error?: string; voucher?: Voucher } {
    if (!input.customerFullName.trim()) return { ok: false, error: 'Enter the customer\'s full name.' }
    if (!input.customerPhone.trim()) return { ok: false, error: 'Enter a valid phone number.' }
    if (!/^\S+@\S+\.\S+$/.test(input.customerEmail)) return { ok: false, error: 'Enter a valid email.' }
    if (!input.secretKey.trim()) return { ok: false, error: 'Enter the customer\'s KokoSend username (secret key).' }
    if (!input.amount || input.amount <= 0) return { ok: false, error: 'Enter a valid amount.' }
    if (hasActiveVoucher(input.secretKey)) {
      return { ok: false, error: 'This KokoSend username already has an active, unredeemed voucher. Wait until it is used or expires before issuing another.' }
    }

    let code = randomVoucherCode()
    while (db.value.vouchers.some((v) => v.code === code)) code = randomVoucherCode()
    const now = new Date().toISOString()

    const voucher: Voucher = {
      id: uid('vch'),
      code,
      customerFullName: input.customerFullName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail.trim(),
      secretKey: input.secretKey.trim(),
      currency: input.currency,
      amount: input.amount,
      status: 'issued',
      redeemMethod: null,
      createdAt: now,
      expiresAt: endOfValidityWindow(now, db.value.settings.voucherValidityDays),
      redeemedAt: null,
      verifyAttempts: 0,
      voidReason: null,
      events: [{ type: 'issued', at: now }]
    }
    db.value.vouchers.push(voucher)

    const summary = `Code ${voucher.code}, menu link, and a note that the secret key is their KokoSend username.`
    pushNotification({ channel: 'email', recipientType: 'customer', recipient: voucher.customerEmail, template: 'voucher_issued', subject: `You've got a KokoVoucher — ${formatCurrency(voucher.amount, voucher.currency)}`, summary })
    pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: voucher.customerPhone, template: 'voucher_issued', subject: `You've got a KokoVoucher — ${formatCurrency(voucher.amount, voucher.currency)}`, summary })
    pushAudit({ actor: 'admin', action: 'voucher.issue', targetType: 'voucher', targetId: voucher.id, note: `${formatCurrency(voucher.amount, voucher.currency)} to ${voucher.secretKey}` })

    return { ok: true, voucher }
  }

  function voidVoucher(id: string, reason: string) {
    const v = getVoucher(id)
    if (!v) return { ok: false, error: 'Voucher not found.' }
    if (v.status !== 'issued') return { ok: false, error: 'Only an untouched, unredeemed voucher can be voided.' }
    v.status = 'void'
    v.voidReason = reason.trim() || null
    v.events.push({ type: 'voided', at: new Date().toISOString(), note: v.voidReason ?? undefined })
    pushNotification({
      channel: 'email', recipientType: 'customer', recipient: v.customerEmail, template: 'voucher_voided',
      subject: 'Your KokoVoucher was cancelled', summary: `Code ${v.code} was cancelled by KokoVoucher${v.voidReason ? ` — ${v.voidReason}` : ''}. Contact support if you weren't expecting this.`
    })
    pushNotification({
      channel: 'whatsapp', recipientType: 'customer', recipient: v.customerPhone, template: 'voucher_voided',
      subject: 'Your KokoVoucher was cancelled', summary: `Code ${v.code} was cancelled by KokoVoucher${v.voidReason ? ` — ${v.voidReason}` : ''}. Contact support if you weren't expecting this.`
    })
    pushAudit({ actor: 'admin', action: 'voucher.void', targetType: 'voucher', targetId: v.id, note: v.voidReason ?? undefined })
    return { ok: true }
  }

  function resendVoucherNotification(id: string) {
    const v = getVoucher(id)
    if (!v) return { ok: false }
    const status = computeEffectiveVoucherStatus(v)
    if (status !== 'issued' && status !== 'reserved') return { ok: false }
    const summary = `Code ${v.code}, menu link, and a note that the secret key is their KokoSend username.`
    pushNotification({ channel: 'email', recipientType: 'customer', recipient: v.customerEmail, template: 'voucher_issued', subject: 'Your KokoVoucher (resent)', summary })
    pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: v.customerPhone, template: 'voucher_issued', subject: 'Your KokoVoucher (resent)', summary })
    pushAudit({ actor: 'admin', action: 'voucher.resend', targetType: 'voucher', targetId: v.id })
    return { ok: true }
  }

  /** Shared code+secret-key check used by both delivery checkout and walk-in redemption. Rate-limited. */
  function verifyVoucherAccess(code: string, secretKey: string): { ok: boolean; reason?: VerifyReason; voucher?: Voucher; attemptsLeft?: number } {
    const v = db.value.vouchers.find((x) => x.code.toUpperCase() === code.trim().toUpperCase())
    if (!v) return { ok: false, reason: 'NOT_FOUND' }

    const effective = computeEffectiveVoucherStatus(v)
    if (effective === 'expired') {
      if (v.status !== 'expired') {
        v.status = 'expired'
        v.events.push({ type: 'expired', at: new Date().toISOString() })
      }
      return { ok: false, reason: 'EXPIRED' }
    }
    if (v.status === 'redeemed') return { ok: false, reason: 'ALREADY_USED' }
    if (v.status === 'void') return { ok: false, reason: 'NOT_FOUND' }
    if (v.verifyAttempts >= VERIFY_MAX_ATTEMPTS) return { ok: false, reason: 'LOCKED' }

    if (normalizeKey(v.secretKey) !== normalizeKey(secretKey)) {
      v.verifyAttempts += 1
      return { ok: false, reason: 'WRONG_CREDENTIALS', attemptsLeft: Math.max(0, VERIFY_MAX_ATTEMPTS - v.verifyAttempts) }
    }

    return { ok: true, voucher: v }
  }

  // ---------- delivery orders ----------
  function getOrder(idOrReference: string) {
    return db.value.orders.find((o) => o.id === idOrReference || o.reference.toUpperCase() === idOrReference.toUpperCase())
  }

  function placeOrder(input: {
    code: string; secretKey: string; comboId: string
    spiceLevel: SpiceLevel | null; drinkChoice: string | null
    deliveryName: string; deliveryPhone: string; deliveryWhatsapp: string
    houseName: string; houseNumber: string; floor: string; landmark?: string | null
    dropOption: DropOption; additionalInfo?: string | null
  }): { ok: boolean; reason?: VerifyReason | OrderActionReason; order?: Order } {
    const check = verifyVoucherAccess(input.code, input.secretKey)
    if (!check.ok || !check.voucher) return { ok: false, reason: check.reason }
    const voucher = check.voucher

    if (voucher.status !== 'issued') return { ok: false, reason: 'VOUCHER_NOT_AVAILABLE' }

    const combo = db.value.combos.find((c) => c.id === input.comboId)
    if (!combo || !combo.available) return { ok: false, reason: 'COMBO_UNAVAILABLE' }
    const restaurant = getRestaurant(combo.restaurantId)
    if (!restaurant || restaurant.status !== 'active') return { ok: false, reason: 'RESTAURANT_UNAVAILABLE' }
    if (restaurant.currency !== voucher.currency) return { ok: false, reason: 'CURRENCY_MISMATCH' }
    if (combo.spiceOption && !input.spiceLevel) return { ok: false, reason: 'SPICE_LEVEL_REQUIRED' }
    const drinkOptions = [...combo.sodaOptions, ...(combo.waterOption ? ['Water'] : [])]
    if (drinkOptions.length && (!input.drinkChoice || !drinkOptions.includes(input.drinkChoice))) {
      return { ok: false, reason: 'DRINK_CHOICE_REQUIRED' }
    }

    const now = new Date().toISOString()
    const order: Order = {
      id: uid('ord'),
      reference: randomOrderReference(),
      voucherId: voucher.id,
      comboId: combo.id,
      restaurantId: restaurant.id,
      status: 'placed',
      spiceLevel: combo.spiceOption ? input.spiceLevel : null,
      drinkChoice: drinkOptions.length ? input.drinkChoice : null,
      deliveryName: input.deliveryName.trim(),
      deliveryPhone: input.deliveryPhone.trim(),
      deliveryWhatsapp: input.deliveryWhatsapp.trim(),
      houseName: input.houseName.trim(),
      houseNumber: input.houseNumber.trim(),
      floor: input.floor.trim(),
      landmark: input.landmark?.trim() || null,
      dropOption: input.dropOption,
      additionalInfo: input.additionalInfo?.trim() || null,
      createdAt: now,
      statusHistory: [{ status: 'placed', at: now }],
      disputeReported: false,
      disputeNote: null
    }
    db.value.orders.push(order)

    voucher.status = 'reserved'
    voucher.redeemMethod = 'delivery'
    voucher.events.push({ type: 'reserved', at: now })

    pushNotification({ channel: 'email', recipientType: 'customer', recipient: voucher.customerEmail, template: 'order_placed', subject: 'Order confirmed', summary: `Order ${order.reference} placed at ${restaurant.name} for ${combo.name}.` })
    pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: voucher.customerPhone, template: 'order_placed', subject: 'Order confirmed', summary: `Order ${order.reference} placed at ${restaurant.name} for ${combo.name}.` })
    pushNotification({ channel: 'email', recipientType: 'restaurant', recipient: restaurant.contactEmail, template: 'order_placed', subject: 'New delivery order', summary: `New order ${order.reference} — ${combo.name}.` })
    pushNotification({ channel: 'email', recipientType: 'admin', recipient: db.value.settings.adminEmail, template: 'order_placed', subject: 'New order placed', summary: `${order.reference} — ${restaurant.name} — ${formatCurrency(voucher.amount, voucher.currency)}.` })

    return { ok: true, order }
  }

  function updateOrderStatus(orderId: string, next: OrderStatus, note?: string): { ok: boolean; error?: string } {
    const order = getOrder(orderId)
    if (!order) return { ok: false, error: 'Order not found.' }
    const voucher = getVoucher(order.voucherId)
    if (!voucher) return { ok: false, error: 'Voucher not found.' }

    const forwardIdx = ORDER_STATUS_FLOW.indexOf(order.status)
    const nextIdx = ORDER_STATUS_FLOW.indexOf(next)
    const isForwardStep = nextIdx === forwardIdx + 1
    const isTerminalExit = (next === 'cancelled' || next === 'rejected') && (order.status === 'placed' || order.status === 'received')

    if (!isForwardStep && !isTerminalExit) return { ok: false, error: `Cannot move an order from ${order.status} to ${next}.` }

    const now = new Date().toISOString()
    order.status = next
    order.statusHistory.push({ status: next, at: now, note })

    if (next === 'delivered') {
      const item: PayoutItem = { id: uid('pyi'), restaurantId: order.restaurantId, sourceType: 'order', sourceId: order.id, amount: voucher.amount, currency: voucher.currency, status: 'pending', createdAt: now, revokedAt: null, revokeReason: null, payoutId: null }
      db.value.payoutItems.push(item)
      voucher.status = 'redeemed'
      voucher.redeemedAt = now
      voucher.events.push({ type: 'redeemed_delivery', at: now })
      pushNotification({ channel: 'email', recipientType: 'customer', recipient: voucher.customerEmail, template: 'order_delivered', subject: 'Delivered!', summary: `Order ${order.reference} delivered. Didn't receive it? Report a problem.` })
      pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: voucher.customerPhone, template: 'order_delivered', subject: 'Delivered!', summary: `Order ${order.reference} delivered. Didn't receive it? Report a problem.` })
    } else if (next === 'received' || next === 'dispatched') {
      pushNotification({ channel: 'email', recipientType: 'customer', recipient: voucher.customerEmail, template: `order_${next}`, subject: `Order ${next}`, summary: `Order ${order.reference} is now ${next}.` })
      pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: voucher.customerPhone, template: `order_${next}`, subject: `Order ${next}`, summary: `Order ${order.reference} is now ${next}.` })
    } else if (next === 'cancelled' || next === 'rejected') {
      const effective = computeEffectiveVoucherStatus(voucher)
      if (effective === 'expired') {
        voucher.status = 'expired'
        voucher.events.push({ type: 'expired', at: now })
      } else {
        voucher.status = 'issued'
        voucher.redeemMethod = null
        voucher.events.push({ type: 'released', at: now, note: note || `Order ${next}` })
      }
      pushNotification({ channel: 'email', recipientType: 'customer', recipient: voucher.customerEmail, template: `order_${next}`, subject: 'Order could not be completed', summary: `Order ${order.reference} was ${next}${effective !== 'expired' ? ' — your voucher is active again, try another restaurant.' : '.'}` })
      pushNotification({ channel: 'whatsapp', recipientType: 'customer', recipient: voucher.customerPhone, template: `order_${next}`, subject: 'Order could not be completed', summary: `Order ${order.reference} was ${next}${effective !== 'expired' ? ' — your voucher is active again, try another restaurant.' : '.'}` })
    }

    return { ok: true }
  }

  function reportOrderProblem(reference: string, secretKey: string, note: string): { ok: boolean; error?: string } {
    const order = getOrder(reference)
    if (!order) return { ok: false, error: 'Order not found. Check the reference and try again.' }
    const voucher = getVoucher(order.voucherId)
    if (!voucher || normalizeKey(voucher.secretKey) !== normalizeKey(secretKey)) {
      return { ok: false, error: 'Order reference and secret key do not match.' }
    }
    if (order.status !== 'delivered') return { ok: false, error: 'Only a delivered order can be reported.' }
    if (order.disputeReported) return { ok: false, error: 'A problem has already been reported for this order.' }
    order.disputeReported = true
    order.disputeNote = note.trim() || 'Customer reported a problem with this order.'
    pushNotification({ channel: 'email', recipientType: 'admin', recipient: db.value.settings.adminEmail, template: 'order_disputed', subject: 'Order dispute reported', summary: `${order.reference}: ${order.disputeNote}` })
    return { ok: true }
  }

  // ---------- walk-in ----------
  function completeWalkIn(input: { code: string; secretKey: string; restaurantId: string; billAmount: number }):
    { ok: boolean; reason?: VerifyReason | OrderActionReason; walkIn?: WalkIn } {
    if (!input.billAmount || input.billAmount <= 0) return { ok: false, reason: 'VOUCHER_NOT_AVAILABLE' }
    const check = verifyVoucherAccess(input.code, input.secretKey)
    if (!check.ok || !check.voucher) return { ok: false, reason: check.reason }
    const voucher = check.voucher

    if (voucher.status !== 'issued') return { ok: false, reason: 'VOUCHER_NOT_AVAILABLE' }
    const restaurant = getRestaurant(input.restaurantId)
    if (!restaurant || restaurant.status !== 'active') return { ok: false, reason: 'RESTAURANT_UNAVAILABLE' }
    if (restaurant.currency !== voucher.currency) return { ok: false, reason: 'CURRENCY_MISMATCH' }

    const now = new Date().toISOString()
    const creditedAmount = Math.min(voucher.amount, input.billAmount)
    const forfeitedAmount = Math.max(0, voucher.amount - creditedAmount)

    const walkIn: WalkIn = { id: uid('wlk'), voucherId: voucher.id, restaurantId: restaurant.id, billAmount: input.billAmount, creditedAmount, forfeitedAmount, createdAt: now }
    db.value.walkIns.push(walkIn)

    const item: PayoutItem = { id: uid('pyi'), restaurantId: restaurant.id, sourceType: 'walk_in', sourceId: walkIn.id, amount: creditedAmount, currency: voucher.currency, status: 'pending', createdAt: now, revokedAt: null, revokeReason: null, payoutId: null }
    db.value.payoutItems.push(item)

    voucher.status = 'redeemed'
    voucher.redeemMethod = 'walk_in'
    voucher.redeemedAt = now
    voucher.events.push({ type: 'redeemed_walkin', at: now, note: `Bill ${formatCurrency(input.billAmount, voucher.currency)}, credited ${formatCurrency(creditedAmount, voucher.currency)}` })

    pushNotification({
      channel: 'email', recipientType: 'customer', recipient: voucher.customerEmail, template: 'walkin_alert', subject: 'Voucher redeemed',
      summary: `${formatCurrency(creditedAmount, voucher.currency)} redeemed at ${restaurant.name}. Not you? Reply to report it.`
    })
    pushNotification({
      channel: 'whatsapp', recipientType: 'customer', recipient: voucher.customerPhone, template: 'walkin_alert', subject: 'Voucher redeemed',
      summary: `${formatCurrency(creditedAmount, voucher.currency)} redeemed at ${restaurant.name}. Not you? Reply to report it.`
    })

    return { ok: true, walkIn }
  }

  // ---------- payouts ----------
  function pendingPayoutItems(restaurantId: string) {
    return db.value.payoutItems.filter((i) => i.restaurantId === restaurantId && i.status === 'pending')
  }
  function pendingBalance(restaurantId: string) {
    return pendingPayoutItems(restaurantId).reduce((sum, i) => sum + i.amount, 0)
  }
  function payoutHistory(restaurantId: string) {
    return db.value.payouts.filter((p) => p.restaurantId === restaurantId).sort((a, b) => +new Date(b.processedAt) - +new Date(a.processedAt))
  }

  function processPayout(restaurantId: string, reference?: string): { ok: boolean; error?: string; payout?: Payout } {
    const items = pendingPayoutItems(restaurantId)
    if (!items.length) return { ok: false, error: 'Nothing pending for this restaurant.' }
    const restaurant = getRestaurant(restaurantId)
    if (!restaurant) return { ok: false, error: 'Restaurant not found.' }
    const currency = items[0].currency
    const total = items.reduce((sum, i) => sum + i.amount, 0)
    const now = new Date().toISOString()

    const payout: Payout = { id: uid('pyo'), restaurantId, totalAmount: total, currency, itemCount: items.length, reference: reference?.trim() || null, processedAt: now }
    db.value.payouts.push(payout)
    for (const item of items) {
      item.status = 'paid'
      item.payoutId = payout.id
    }

    pushNotification({ channel: 'email', recipientType: 'restaurant', recipient: restaurant.contactEmail, template: 'payout_processed', subject: 'Payout processed', summary: `${formatCurrency(total, currency)} paid out across ${items.length} item${items.length === 1 ? '' : 's'}${payout.reference ? ` — ref: ${payout.reference}` : ''}.` })
    pushAudit({ actor: 'admin', action: 'payout.process', targetType: 'restaurant', targetId: restaurantId, note: `${formatCurrency(total, currency)} — ${items.length} item${items.length === 1 ? '' : 's'}` })

    return { ok: true, payout }
  }

  function revokePayoutItem(itemId: string, reason: string): { ok: boolean; error?: string } {
    const item = db.value.payoutItems.find((i) => i.id === itemId)
    if (!item) return { ok: false, error: 'Item not found.' }
    if (item.status !== 'pending') return { ok: false, error: 'Only a pending item can be revoked.' }
    if (!reason.trim()) return { ok: false, error: 'A reason is required to revoke a payment.' }
    item.status = 'revoked'
    item.revokedAt = new Date().toISOString()
    item.revokeReason = reason.trim()

    const restaurant = getRestaurant(item.restaurantId)
    if (restaurant) {
      pushNotification({ channel: 'email', recipientType: 'restaurant', recipient: restaurant.contactEmail, template: 'payout_revoked', subject: 'Payout item revoked', summary: `${formatCurrency(item.amount, item.currency)} credit revoked — ${item.revokeReason}` })
    }
    pushAudit({ actor: 'admin', action: 'payout.revoke', targetType: 'payout_item', targetId: item.id, note: item.revokeReason ?? undefined })
    return { ok: true }
  }

  // ---------- dashboard ----------
  const dashboardSummary = computed(() => {
    const now = new Date().toISOString()
    const todays = db.value.vouchers.filter((v) => isSameCalendarDay(v.createdAt, now))
    const statusOf = (v: Voucher) => computeEffectiveVoucherStatus(v)
    const pendingByCurrency: Partial<Record<Currency, number>> = {}
    for (const item of db.value.payoutItems.filter((i) => i.status === 'pending')) {
      pendingByCurrency[item.currency] = (pendingByCurrency[item.currency] ?? 0) + item.amount
    }
    return {
      issuedToday: todays.length,
      reservedToday: todays.filter((v) => statusOf(v) === 'reserved').length,
      redeemedToday: todays.filter((v) => statusOf(v) === 'redeemed').length,
      expiredToday: todays.filter((v) => statusOf(v) === 'expired').length,
      invitedRestaurants: db.value.restaurants.filter((r) => r.status === 'invited').length,
      openDisputes: db.value.orders.filter((o) => o.disputeReported).length,
      pendingByCurrency
    }
  })

  return {
    db,
    session,
    currentRestaurant,
    activeRestaurants,
    publicMenu,
    dashboardSummary,
    // restaurants
    getRestaurant,
    getRestaurantByInviteToken,
    createRestaurant,
    updateRestaurant,
    resendInvite,
    acceptInvite,
    disableRestaurant,
    enableRestaurant,
    // menu
    combosByRestaurant,
    createCombo,
    updateCombo,
    toggleComboAvailability,
    // auth
    loginAdmin,
    loginRestaurant,
    logout,
    // vouchers
    getVoucher,
    hasActiveVoucher,
    generateVoucher,
    voidVoucher,
    resendVoucherNotification,
    verifyVoucherAccess,
    // orders
    getOrder,
    placeOrder,
    updateOrderStatus,
    reportOrderProblem,
    // walk-in
    completeWalkIn,
    // payouts
    pendingPayoutItems,
    pendingBalance,
    payoutHistory,
    processPayout,
    revokePayoutItem,
    VERIFY_MAX_ATTEMPTS
  }
}
