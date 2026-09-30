// shared/types/models.ts
// Friendly aliases over the generated Supabase types. Import these, not the raw Database shape.
import type { Database } from './database.types'

type Tables = Database['public']['Tables']
type Enums = Database['public']['Enums']

export type Currency = Enums['currency']
export type RestaurantStatus = Enums['restaurant_status']

export type Restaurant = Tables['restaurants']['Row']
export type Combo = Tables['combos']['Row']

type MenuRow = Database['public']['Views']['public_menu']['Row']
/**
 * A row of the public menu (available combo of an active restaurant). Postgres reports every
 * view column as nullable, but the underlying columns are NOT NULL — only the logo is optional.
 */
export type MenuItem = { [K in keyof MenuRow]-?: K extends 'restaurant_logo_path' ? string | null : NonNullable<MenuRow[K]> }

export const COMBO_CATEGORIES = ['Combos', 'Family Meals', 'Lunch Deals'] as const
export const MAX_SODA_OPTIONS = 10

/** Every drink a customer may pick for a combo: its sodas, plus Water when enabled. */
export function drinkChoices(combo: { soda_options: string[]; water_option: boolean }) {
  return [...combo.soda_options, ...(combo.water_option ? ['Water'] : [])]
}

export const CURRENCIES: readonly Currency[] = ['NGN', 'KES', 'USD']

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { value: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
  { value: 'USD', label: 'USD — US Dollar ($)' }
]

export type Voucher = Tables['vouchers']['Row']
export type VoucherStatus = Enums['voucher_status']
export type VoucherEventType = Enums['voucher_event_type']
export type Notification = Tables['notifications']['Row']
export type Order = Tables['orders']['Row']
export type OrderHistory = Tables['order_status_history']['Row']

/** Wrong code/secret-key attempts before a voucher locks (rule 18). */
export const VERIFY_MAX_ATTEMPTS = 5
/** Upper bound for a single voucher, in whole currency units. */
export const MAX_VOUCHER_AMOUNT = 10_000_000

/** Minimum password length for restaurant accounts (invite acceptance, reset, change). */
export const MIN_PASSWORD_LENGTH = 8
