// POST /api/admin/payout-items/:id/revoke — pull a PENDING credit before payout (§5), with a
// reason. One conditional UPDATE: if a payout is taking this item at the same moment, the payout
// holds the row lock, and this finds it already paid and refuses.
import { z } from 'zod'

const schema = z.object({ reason: z.string({ error: 'Give a reason — the restaurant sees it.' }).trim().min(3, 'Give a reason — the restaurant sees it.').max(500) })

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')
  const { reason } = await parseBody(event, schema)
  const db = useServiceClient()

  const { data: item } = await db
    .from('payout_items')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: reason })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, restaurant_id, amount, currency')
    .maybeSingle()
  if (!item) fail(409, 'Only a pending credit can be revoked. It may already have been paid out or revoked.')

  const [{ data: line }, { data: restaurant }] = await Promise.all([
    db.from('payout_ledger').select('source_type, order_reference, walk_in_bill, currency').eq('id', id).single(),
    db.from('restaurants').select('name, contact_email').eq('id', item.restaurant_id).single()
  ])
  const source = line ? payoutSourceLabel(line) : 'Credit'

  if (restaurant) {
    await notifyEmail(
      { recipientType: 'restaurant', to: restaurant.contact_email, template: 'payout_revoked', related: { type: 'payout_item', id } },
      payoutItemRevokedEmail({ restaurantName: restaurant.name, amount: Number(item.amount), currency: item.currency, source, reason }, siteUrl())
    )
  }
  await audit({ actor: 'admin', actorId: admin.id, action: 'payout.revoke', targetType: 'payout_item', targetId: id, note: `${formatCurrency(Number(item.amount), item.currency)} (${source}): ${reason}` })

  return { ok: true }
})
