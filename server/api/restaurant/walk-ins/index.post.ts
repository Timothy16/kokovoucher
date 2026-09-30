// POST /api/restaurant/walk-ins — step 2: redeem the voucher against the actual bill.
// Credits min(voucher, bill), forfeits the rest (rule 10), alerts the customer (rule 11).
import { z } from 'zod'
import { MAX_VOUCHER_AMOUNT } from '#shared/types/models'

const schema = z.object({
  ...voucherCredentials,
  billAmount: z.number({ error: 'Enter the bill amount.' }).positive('Enter the bill amount.').max(MAX_VOUCHER_AMOUNT * 10, 'That bill is too large.')
})

interface Completed {
  ok: boolean
  reason?: string
  voucher_currency?: string
  walk_in_id: string
  voucher_amount: number
  bill_amount: number
  credited_amount: number
  forfeited_amount: number
  currency: 'NGN' | 'KES' | 'USD'
  customer_name: string
  customer_email: string
  customer_phone: string
}

export default defineEventHandler(async (event) => {
  const restaurant = await requireRestaurant(event)
  const { code, secretKey, billAmount } = await parseBody(event, schema)

  const { data, error } = await useServiceClient().rpc('complete_walkin', { p_code: code, p_secret_key: secretKey, p_restaurant_id: restaurant.id, p_bill: billAmount })
  if (error) fail(500, 'Could not complete the redemption. Please try again.')
  const w = data as unknown as Completed
  if (!w.ok) refuse(w)

  const email = walkInRedeemedEmail({
    customerName: w.customer_name,
    restaurantName: restaurant.name,
    currency: w.currency,
    billAmount: Number(w.bill_amount),
    creditedAmount: Number(w.credited_amount),
    forfeitedAmount: Number(w.forfeited_amount)
  })
  const target = { recipientType: 'customer' as const, template: 'walkin_alert', related: { type: 'walk_in', id: w.walk_in_id } }
  await notifyEmail({ ...target, to: w.customer_email }, email)
  await notifyWhatsapp({ ...target, to: w.customer_phone }, email)

  return {
    currency: w.currency,
    voucherAmount: Number(w.voucher_amount),
    billAmount: Number(w.bill_amount),
    creditedAmount: Number(w.credited_amount),
    forfeitedAmount: Number(w.forfeited_amount)
  }
})
