// shared/utils/order.ts — auto-imported in both the app and the server.
import type { Database } from '../types/database.types'

type Enums = Database['public']['Enums']
export type OrderStatus = Enums['order_status']
export type DropOption = Enums['drop_option']
export type SpiceLevel = Enums['spice_level']

/** The happy path of a delivery order, in order. */
export const ORDER_STATUS_FLOW: OrderStatus[] = ['placed', 'received', 'dispatched', 'delivered']

export const ORDER_STEP_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  received: 'Received',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected'
}

export const DROP_OPTION_LABEL: Record<DropOption, string> = { door_drop: 'Door drop', leave_at_gate: 'Leave at the gate' }

export const SPICE_LABEL: Record<SpiceLevel, string> = { spicy: 'Spicy', non_spicy: 'Non-spicy' }

/** Composes the structured delivery fields into one readable line. */
export function formatOrderAddress(o: { house_name: string; house_number: string; floor: string; landmark: string | null }) {
  const parts = [o.house_name, `House ${o.house_number}`, `Floor ${o.floor}`]
  if (o.landmark) parts.push(`near ${o.landmark}`)
  return parts.filter(Boolean).join(', ')
}

/** The status a restaurant moves an order to next, if any. */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_STATUS_FLOW.indexOf(status)
  return i >= 0 && i < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[i + 1]! : null
}
