export type Currency = 'NGN' | 'KES' | 'USD'
export type VoucherStatus = 'issued' | 'active' | 'redeemed' | 'expired'
export type RestaurantStatus = 'pending' | 'approved' | 'rejected'

export interface Restaurant {
  id: string
  name: string
  email: string
  password: string
  status: RestaurantStatus
  joinedAt: string
  redemptions: number
}

export interface VoucherEvent {
  type: 'issued' | 'delivered' | 'activated' | 'redeemed' | 'expired'
  at: string
  note?: string
}

export interface Voucher {
  id: string
  code: string
  claimToken: string
  customerEmail: string
  customerPhone: string
  restaurantId: string
  restaurantName: string
  currency: Currency
  amount: number
  status: VoucherStatus
  createdAt: string
  expiresAt: string
  activatedAt: string | null
  redeemedAt: string | null
  otp: string
  otpAttempts: number
  otpSentAt: string
  events: VoucherEvent[]
}

export type RedeemReason = 'NOT_FOUND' | 'ALREADY_REDEEMED' | 'EXPIRED' | 'WRONG_RESTAURANT' | 'NOT_ACTIVE'
export type OtpReason = 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_ACTIVE' | 'LOCKED' | 'WRONG_CODE'
export type LoginReason = 'INVALID' | 'PENDING' | 'REJECTED'

interface Session {
  role: 'admin' | 'restaurant' | null
  restaurantId: string | null
}

interface Db {
  admin: { id: string; name: string; email: string; password: string }
  restaurants: Restaurant[]
  vouchers: Voucher[]
  session: Session
}

const STORAGE_KEY = 'kokovoucher-db-v1'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const OTP_COOLDOWN_SECONDS = 60
const OTP_MAX_ATTEMPTS = 5

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

function randomCode() {
  const part = () =>
    Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
  return `${part()}-${part()}`
}

function randomClaimToken() {
  return Array.from({ length: 24 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('').toLowerCase()
}

function randomOtp() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function endOfDayISO(fromISO: string) {
  const d = new Date(fromISO)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function isSameCalendarDay(aISO: string, bISO: string) {
  const a = new Date(aISO)
  const b = new Date(bISO)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function seedDb(): Db {
  const restaurants: Restaurant[] = [
    { id: 'rst_01', name: 'Mama Put Kitchen', email: 'hello@mamaput.ng', password: 'restaurant123', status: 'approved', joinedAt: '2026-08-20', redemptions: 42 },
    { id: 'rst_02', name: 'Nairobi Bites', email: 'team@nairobibites.ke', password: 'restaurant123', status: 'approved', joinedAt: '2026-08-25', redemptions: 18 },
    { id: 'rst_03', name: 'The Yellow Chilli', email: 'info@yellowchilli.ng', password: 'restaurant123', status: 'pending', joinedAt: '2026-09-09', redemptions: 0 },
    { id: 'rst_04', name: 'Java House', email: 'hi@javahouse.ke', password: 'restaurant123', status: 'pending', joinedAt: '2026-09-10', redemptions: 0 }
  ]

  const now = new Date()
  const today = now.toISOString()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const mk = (over: Partial<Voucher> & Pick<Voucher, 'customerEmail' | 'customerPhone' | 'restaurantId' | 'currency' | 'amount' | 'status'>, createdAtISO: string): Voucher => {
    const restaurant = restaurants.find((r) => r.id === over.restaurantId)!
    const createdAt = createdAtISO
    const events: VoucherEvent[] = [{ type: 'issued', at: createdAt }, { type: 'delivered', at: createdAt, note: 'Claim link sent' }]
    if (over.activatedAt) events.push({ type: 'activated', at: over.activatedAt })
    if (over.redeemedAt) events.push({ type: 'redeemed', at: over.redeemedAt })
    if (over.status === 'expired') events.push({ type: 'expired', at: endOfDayISO(createdAt) })
    return {
      id: uid('vch'),
      code: randomCode(),
      claimToken: randomClaimToken(),
      restaurantName: restaurant.name,
      createdAt,
      expiresAt: endOfDayISO(createdAt),
      activatedAt: null,
      redeemedAt: null,
      otp: randomOtp(),
      otpAttempts: 0,
      otpSentAt: createdAt,
      events,
      ...over
    }
  }

  const vouchers: Voucher[] = [
    mk({ customerEmail: 'amaka@example.com', customerPhone: '+2348030000001', restaurantId: 'rst_01', currency: 'NGN', amount: 5000, status: 'active', activatedAt: today }, today),
    mk({ customerEmail: 'wanjiru@example.com', customerPhone: '+254700000002', restaurantId: 'rst_02', currency: 'KES', amount: 800, status: 'redeemed', activatedAt: today, redeemedAt: today }, today),
    mk({ customerEmail: 'tunde@example.com', customerPhone: '+2348030000003', restaurantId: 'rst_01', currency: 'USD', amount: 10, status: 'issued' }, today),
    mk({ customerEmail: 'chidi@example.com', customerPhone: '+2348030000004', restaurantId: 'rst_02', currency: 'NGN', amount: 3500, status: 'expired', activatedAt: yesterday }, yesterday)
  ]

  return {
    admin: { id: 'adm_01', name: 'Admin User', email: 'admin@kokovoucher.app', password: 'admin123' },
    restaurants,
    vouchers,
    session: { role: null, restaurantId: null }
  }
}

function loadDb(): Db {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as Db
    } catch {
      // fall through to fresh seed
    }
  }
  return seedDb()
}

export function computeEffectiveStatus(voucher: Voucher): VoucherStatus {
  if ((voucher.status === 'issued' || voucher.status === 'active') && Date.now() > new Date(voucher.expiresAt).getTime()) {
    return 'expired'
  }
  return voucher.status
}

export function formatCurrency(amount: number, currency: Currency) {
  const symbols: Record<Currency, string> = { NGN: '₦', KES: 'KSh ', USD: '$' }
  return `${symbols[currency]}${amount.toLocaleString('en-US')}`
}

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
          if ((v.status === 'issued' || v.status === 'active') && computeEffectiveStatus(v) === 'expired') {
            v.status = 'expired'
            v.events.push({ type: 'expired', at: new Date().toISOString() })
            changed = true
          }
        }
        if (changed) db.value = { ...db.value }
      }, 15000)
    }
  }

  const session = computed(() => db.value.session)
  const currentRestaurant = computed<Restaurant | null>(() => {
    if (session.value.role !== 'restaurant' || !session.value.restaurantId) return null
    return db.value.restaurants.find((r) => r.id === session.value.restaurantId) ?? null
  })
  const approvedRestaurants = computed(() => db.value.restaurants.filter((r) => r.status === 'approved'))

  function getVoucher(idOrCode: string): Voucher | undefined {
    return db.value.vouchers.find((v) => v.id === idOrCode || v.code.toUpperCase() === idOrCode.toUpperCase())
  }

  function getVoucherByClaimToken(token: string): Voucher | undefined {
    return db.value.vouchers.find((v) => v.claimToken === token)
  }

  function loginAdmin(email: string, password: string) {
    const ok = db.value.admin.email.toLowerCase() === email.trim().toLowerCase() && db.value.admin.password === password
    if (ok) db.value.session = { role: 'admin', restaurantId: null }
    return ok
  }

  function loginRestaurant(email: string, password: string): { ok: boolean; reason?: LoginReason; restaurant?: Restaurant } {
    const restaurant = db.value.restaurants.find((r) => r.email.toLowerCase() === email.trim().toLowerCase())
    if (!restaurant || restaurant.password !== password) return { ok: false, reason: 'INVALID' }
    if (restaurant.status === 'rejected') return { ok: false, reason: 'REJECTED' }
    db.value.session = { role: 'restaurant', restaurantId: restaurant.id }
    if (restaurant.status === 'pending') return { ok: false, reason: 'PENDING', restaurant }
    return { ok: true, restaurant }
  }

  function registerRestaurant(input: { name: string; email: string; password: string }): { ok: boolean; error?: string; restaurant?: Restaurant } {
    const email = input.name.trim() ? input.email.trim().toLowerCase() : input.email.trim().toLowerCase()
    if (db.value.restaurants.some((r) => r.email.toLowerCase() === email)) {
      return { ok: false, error: 'A restaurant with this email is already registered.' }
    }
    const restaurant: Restaurant = {
      id: uid('rst'),
      name: input.name.trim(),
      email,
      password: input.password,
      status: 'pending',
      joinedAt: new Date().toISOString().slice(0, 10),
      redemptions: 0
    }
    db.value.restaurants.push(restaurant)
    db.value.session = { role: 'restaurant', restaurantId: restaurant.id }
    return { ok: true, restaurant }
  }

  function approveRestaurant(id: string) {
    const r = db.value.restaurants.find((x) => x.id === id)
    if (r) r.status = 'approved'
  }

  function rejectRestaurant(id: string) {
    const r = db.value.restaurants.find((x) => x.id === id)
    if (r) r.status = 'rejected'
  }

  function logout() {
    db.value.session = { role: null, restaurantId: null }
  }

  function generateVoucher(input: { customerEmail: string; customerPhone: string; restaurantId: string; currency: Currency; amount: number }): { ok: boolean; error?: string; voucher?: Voucher } {
    const restaurant = db.value.restaurants.find((r) => r.id === input.restaurantId)
    if (!restaurant || restaurant.status !== 'approved') {
      return { ok: false, error: 'Select an approved restaurant.' }
    }
    if (!input.amount || input.amount <= 0) {
      return { ok: false, error: 'Enter a valid amount.' }
    }
    const today = new Date().toISOString()
    const hasToday = db.value.vouchers.some(
      (v) =>
        (v.customerEmail.toLowerCase() === input.customerEmail.trim().toLowerCase() || v.customerPhone === input.customerPhone.trim()) &&
        isSameCalendarDay(v.createdAt, today)
    )
    if (hasToday) {
      return { ok: false, error: 'This customer already has a voucher issued today. Only one voucher per customer per day is allowed.' }
    }
    let code = randomCode()
    while (db.value.vouchers.some((v) => v.code === code)) code = randomCode()
    const claimToken = randomClaimToken()

    const voucher: Voucher = {
      id: uid('vch'),
      code,
      claimToken,
      customerEmail: input.customerEmail.trim(),
      customerPhone: input.customerPhone.trim(),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      currency: input.currency,
      amount: input.amount,
      status: 'issued',
      createdAt: today,
      expiresAt: endOfDayISO(today),
      activatedAt: null,
      redeemedAt: null,
      otp: randomOtp(),
      otpAttempts: 0,
      otpSentAt: today,
      events: [
        { type: 'issued', at: today },
        { type: 'delivered', at: today, note: 'Claim link sent to customer' }
      ]
    }
    db.value.vouchers.push(voucher)
    return { ok: true, voucher }
  }

  function requestOtpResend(voucherId: string): { ok: boolean; secondsLeft?: number } {
    const v = db.value.vouchers.find((x) => x.id === voucherId)
    if (!v) return { ok: false }
    const elapsed = (Date.now() - new Date(v.otpSentAt).getTime()) / 1000
    if (elapsed < OTP_COOLDOWN_SECONDS) {
      return { ok: false, secondsLeft: Math.ceil(OTP_COOLDOWN_SECONDS - elapsed) }
    }
    v.otp = randomOtp()
    v.otpSentAt = new Date().toISOString()
    return { ok: true }
  }

  function verifyOtp(voucherId: string, code: string): { ok: boolean; reason?: OtpReason; attemptsLeft?: number } {
    const v = db.value.vouchers.find((x) => x.id === voucherId)
    if (!v) return { ok: false, reason: 'NOT_FOUND' }
    if (computeEffectiveStatus(v) === 'expired') return { ok: false, reason: 'EXPIRED' }
    if (v.status !== 'issued') return { ok: false, reason: 'ALREADY_ACTIVE' }
    if (v.otpAttempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'LOCKED' }
    if (code.trim() !== v.otp) {
      v.otpAttempts += 1
      return { ok: false, reason: 'WRONG_CODE', attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - v.otpAttempts) }
    }
    v.status = 'active'
    v.activatedAt = new Date().toISOString()
    v.events.push({ type: 'activated', at: v.activatedAt })
    return { ok: true }
  }

  function redeemVoucher(code: string, restaurantId: string): { ok: boolean; reason?: RedeemReason; voucher?: Voucher } {
    const v = db.value.vouchers.find((x) => x.code.toUpperCase() === code.trim().toUpperCase())
    if (!v) return { ok: false, reason: 'NOT_FOUND' }
    if (computeEffectiveStatus(v) === 'expired') {
      if (v.status !== 'expired') {
        v.status = 'expired'
        v.events.push({ type: 'expired', at: new Date().toISOString() })
      }
      return { ok: false, reason: 'EXPIRED' }
    }
    if (v.status === 'redeemed') return { ok: false, reason: 'ALREADY_REDEEMED' }
    if (v.restaurantId !== restaurantId) return { ok: false, reason: 'WRONG_RESTAURANT' }
    if (v.status !== 'active') return { ok: false, reason: 'NOT_ACTIVE' }

    v.status = 'redeemed'
    v.redeemedAt = new Date().toISOString()
    v.events.push({ type: 'redeemed', at: v.redeemedAt })
    const restaurant = db.value.restaurants.find((r) => r.id === restaurantId)
    if (restaurant) restaurant.redemptions += 1
    return { ok: true, voucher: v }
  }

  const dashboardSummary = computed(() => {
    const today = new Date().toISOString()
    const todays = db.value.vouchers.filter((v) => isSameCalendarDay(v.createdAt, today))
    const statusOf = (v: Voucher) => computeEffectiveStatus(v)
    return {
      issued: todays.length,
      active: todays.filter((v) => statusOf(v) === 'active').length,
      redeemed: todays.filter((v) => statusOf(v) === 'redeemed').length,
      expired: todays.filter((v) => statusOf(v) === 'expired').length,
      pendingRestaurants: db.value.restaurants.filter((r) => r.status === 'pending').length
    }
  })

  return {
    db,
    session,
    currentRestaurant,
    approvedRestaurants,
    dashboardSummary,
    getVoucher,
    getVoucherByClaimToken,
    loginAdmin,
    loginRestaurant,
    registerRestaurant,
    approveRestaurant,
    rejectRestaurant,
    logout,
    generateVoucher,
    requestOtpResend,
    verifyOtp,
    redeemVoucher,
    OTP_COOLDOWN_SECONDS,
    OTP_MAX_ATTEMPTS
  }
}
