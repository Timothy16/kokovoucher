// shared/utils/format.ts — auto-imported in both the app and the server.
import type { Currency } from '../types/models'

const SYMBOL: Record<Currency, string> = { NGN: '₦', KES: 'KSh ', USD: '$' }

/** ₦5,000 · KSh 800 · $12.50 — USD keeps cents, NGN/KES are whole numbers. */
export function formatCurrency(amount: number, currency: Currency) {
  const digits = currency === 'USD' && !Number.isInteger(amount) ? 2 : 0
  return `${SYMBOL[currency]}${amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

/** Voucher amounts: USD may carry cents; NGN/KES are whole numbers (mirrors the DB check). */
export function isValidAmount(amount: number, currency: Currency) {
  if (!Number.isFinite(amount) || amount <= 0) return false
  return currency === 'USD' ? Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6 : Number.isInteger(amount)
}
