// POST /api/restaurant/walk-ins/verify — step 1 at the till: is this voucher good here?
// Wrong keys count towards the lockout exactly like online checkout (shared DB check).
import { z } from 'zod'

const schema = z.object(voucherCredentials)

export default defineEventHandler(async (event) => {
  const restaurant = await requireRestaurant(event)
  await rateLimit(event, `walkin-verify-${restaurant.id}`, 60, 600)
  const { code, secretKey } = await parseBody(event, schema)
  const db = useServiceClient()

  const { data, error } = await db.rpc('check_voucher_credentials', { p_code: code, p_secret_key: secretKey })
  if (error) fail(500, 'Could not check the voucher. Please try again.')
  const check = data as unknown as { ok: boolean; reason?: string; voucher_id: string; currency: string; amount: number }
  if (!check.ok) refuse(check)
  if (check.currency !== restaurant.currency) refuse({ reason: 'CURRENCY_MISMATCH', voucher_currency: check.currency })

  const { data: voucher } = await db.from('vouchers').select('customer_full_name').eq('id', check.voucher_id).single()
  return {
    amount: Number(check.amount),
    currency: check.currency,
    // First name only: enough for staff to greet the customer, nothing more.
    customerFirstName: voucher?.customer_full_name.trim().split(/\s+/)[0] ?? null
  }
})
