// PATCH /api/restaurant/orders/:id — the restaurant moves its own order along:
// received → dispatched → delivered (wallet credited), or rejects it (voucher released).
import { z } from 'zod'

const schema = z
  .object({
    status: z.enum(['received', 'dispatched', 'delivered', 'rejected'], { error: 'Choose what to do with this order.' }),
    note: z.string().trim().max(300, 'Keep the reason under 300 characters.').optional()
  })
  .refine((b) => b.status !== 'rejected' || (b.note && b.note.length >= 3), { path: ['note'], message: 'Tell the customer why you are rejecting the order.' })

interface Advanced {
  ok: boolean
  reason?: string
  status: 'received' | 'dispatched' | 'delivered' | 'rejected'
  reference: string
  voucher_released: boolean
  customer_name: string
  customer_email: string
  customer_phone: string
}

export default defineEventHandler(async (event) => {
  const restaurant = await requireRestaurant(event)
  const id = uuidParam(event, 'id')
  const { status, note } = await parseBody(event, schema)

  const { data, error } = await useServiceClient().rpc('advance_order', { p_order_id: id, p_restaurant_id: restaurant.id, p_next: status, p_note: note ?? '' })
  if (error) fail(500, 'Could not update the order. Please try again.')
  const r = data as unknown as Advanced
  if (!r.ok) {
    if (r.reason === 'NOT_FOUND') fail(404, 'Order not found.')
    fail(409, 'This order has already moved on. Refresh to see its latest status.')
  }

  const site = siteUrl()
  const email =
    r.status === 'rejected'
      ? orderNotCompletedEmail({ reference: r.reference, restaurantName: restaurant.name, voucherReleased: r.voucher_released, reason: 'rejected', note }, site)
      : orderProgressEmail({ reference: r.reference, restaurantName: restaurant.name, customerName: r.customer_name }, r.status, site)
  const target = { recipientType: 'customer' as const, template: `order_${r.status}`, related: { type: 'order', id } }
  await notifyEmail({ ...target, to: r.customer_email }, email)
  await notifyWhatsapp({ ...target, to: r.customer_phone }, email)

  return { status: r.status }
})
