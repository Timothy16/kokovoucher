// POST /api/admin/restaurants/:id/payout — pay out the restaurant's pending balance (§5).
// The client sends the total/count it showed the admin; if anything changed since, it's refused.
import { z } from 'zod'

const schema = z.object({
  expectedTotal: z.number({ error: 'Refresh the page and try again.' }).nonnegative(),
  expectedCount: z.number({ error: 'Refresh the page and try again.' }).int().nonnegative(),
  reference: z.string().trim().max(120, 'Keep the reference under 120 characters.').optional(),
  acknowledgeDisputes: z.boolean().optional()
})

interface Processed {
  ok: boolean
  reason?: string
  total: number
  count: number
  disputed?: number
  payout_id: string
  currency: 'NGN' | 'KES' | 'USD'
  reference: string | null
  disputed_included: number
  restaurant_name: string
  restaurant_email: string
}

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const restaurantId = uuidParam(event, 'id')
  const input = await parseBody(event, schema)

  const { data, error } = await useServiceClient().rpc('process_payout', {
    p_restaurant_id: restaurantId,
    p_expected_total: input.expectedTotal,
    p_expected_count: input.expectedCount,
    p_reference: input.reference ?? '',
    p_processed_by: admin.id,
    p_acknowledge_disputes: input.acknowledgeDisputes ?? false
  })
  if (error) fail(500, 'Could not process the payout. Please try again.')
  const p = data as unknown as Processed

  if (!p.ok) {
    const messages: Record<string, [number, string]> = {
      NOT_FOUND: [404, 'Restaurant not found.'],
      NOTHING_PENDING: [409, 'Nothing is pending for this restaurant.'],
      MIXED_CURRENCY: [409, 'This balance contains more than one currency. Contact support before paying it out.'],
      STALE: [409, 'The pending balance changed since you opened this page. Review the updated amount and try again.'],
      DISPUTED_ITEMS: [409, `This payout includes ${p.disputed} disputed item${p.disputed === 1 ? '' : 's'}. Revoke or resolve them first, or confirm you want to pay them anyway.`]
    }
    const [status, message] = messages[p.reason ?? ''] ?? [500, 'Could not process the payout.']
    throw createError({ statusCode: status, message, data: { reason: p.reason } })
  }

  const total = Number(p.total)
  await notifyEmail(
    { recipientType: 'restaurant', to: p.restaurant_email, template: 'payout_processed', related: { type: 'payout', id: p.payout_id } },
    payoutProcessedEmail({ restaurantName: p.restaurant_name, total, currency: p.currency, count: p.count, reference: p.reference }, siteUrl())
  )
  await audit({
    actor: 'admin',
    actorId: admin.id,
    action: 'payout.process',
    targetType: 'restaurant',
    targetId: restaurantId,
    note: `${formatCurrency(total, p.currency)} — ${p.count} item${p.count === 1 ? '' : 's'}${p.reference ? ` — ref ${p.reference}` : ''}${p.disputed_included ? ` — includes ${p.disputed_included} disputed (acknowledged)` : ''}`
  })

  return { payoutId: p.payout_id, total, currency: p.currency, count: p.count }
})
