// GET /api/cron/expiry-reminders — run daily by Vercel Cron (vercel.json).
// Emails every still-unused voucher that expires within the next 48 hours, once.
// Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
import { timingSafeEqual } from 'node:crypto'

const WINDOW_HOURS = 48

function authorised(header: string | undefined) {
  const secret = process.env.CRON_SECRET
  if (!secret || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export default defineEventHandler(async (event) => {
  if (!authorised(getHeader(event, 'authorization'))) fail(401, 'Unauthorised.')

  const { data: vouchers, error } = await useServiceClient().rpc('claim_expiry_reminders', { p_hours: WINDOW_HOURS })
  if (error) fail(500, 'Could not load vouchers to remind.')

  let emailed = 0
  for (const v of vouchers ?? []) {
    const email = voucherExpiringEmail({ ...v, amount: Number(v.amount) }, menuUrlFor(v.currency))
    const target = { recipientType: 'customer' as const, template: 'voucher_expiring', related: { type: 'voucher', id: v.id } }
    if (await notifyEmail({ ...target, to: v.customer_email }, email)) emailed++
    await notifyWhatsapp({ ...target, to: v.customer_phone }, email)
  }
  return { claimed: vouchers?.length ?? 0, emailed }
})
