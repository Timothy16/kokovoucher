// shared/utils/payout.ts — auto-imported in both the app and the server.
import type { Currency } from '../types/models'
import { formatCurrency } from './format'

/** What earned a wallet credit, in words: "Delivery · KV-7H3K9Q" or "Walk-in · bill ₦3,200". */
export function payoutSourceLabel(line: { source_type: 'order' | 'walk_in' | null; order_reference: string | null; walk_in_bill: number | null; currency: Currency | null }) {
  if (line.source_type === 'order') return `Delivery · ${line.order_reference ?? 'order'}`
  return line.walk_in_bill != null && line.currency ? `Walk-in · bill ${formatCurrency(Number(line.walk_in_bill), line.currency)}` : 'Walk-in'
}
