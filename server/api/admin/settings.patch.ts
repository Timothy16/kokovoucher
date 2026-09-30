// PATCH /api/admin/settings — admin notification email + voucher validity window.
// Changing validity only affects vouchers issued from now on.
import { z } from 'zod'

const schema = z.object({
  adminEmail: z.string({ error: 'Enter a valid email.' }).trim().toLowerCase().max(254).pipe(z.email('Enter a valid email.')),
  voucherValidityDays: z.number({ error: 'Enter a number of days.' }).int('Use a whole number of days.').min(1, 'At least 1 day.').max(90, 'At most 90 days.')
})

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const input = await parseBody(event, schema)
  const db = useServiceClient()

  const { data: before } = await db.from('settings').select().single()
  const { data, error } = await db
    .from('settings')
    .update({ admin_email: input.adminEmail, voucher_validity_days: input.voucherValidityDays })
    .eq('id', true)
    .select()
    .single()
  if (error || !data) fail(500, 'Could not save settings. Please try again.')

  const changes = [
    before?.admin_email !== data.admin_email && `admin email ${before?.admin_email} → ${data.admin_email}`,
    before?.voucher_validity_days !== data.voucher_validity_days && `validity ${before?.voucher_validity_days} → ${data.voucher_validity_days} days`
  ].filter(Boolean)
  if (changes.length) await audit({ actor: 'admin', actorId: admin.id, action: 'settings.update', targetType: 'settings', targetId: 'settings', note: changes.join('; ') })

  return data
})
