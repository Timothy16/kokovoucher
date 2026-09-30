// POST /api/admin/orders/:id/resolve — close an open dispute with a note (decision: disputes
// are open → resolved). Money is handled separately on the Payouts page (revoke).
import { z } from 'zod'

const schema = z.object({ note: z.string({ error: 'Add a short resolution note.' }).trim().min(3, 'Add a short resolution note.').max(1000) })

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')
  const { note } = await parseBody(event, schema)

  const { data: order } = await useServiceClient()
    .from('orders')
    .update({ dispute_status: 'resolved', dispute_resolution_note: note, dispute_resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('dispute_status', 'open')
    .select('reference')
    .maybeSingle()
  if (!order) fail(409, 'This order has no open dispute.')

  await audit({ actor: 'admin', actorId: admin.id, action: 'order.dispute_resolve', targetType: 'order', targetId: id, note: `${order.reference}: ${note}` })
  return { ok: true }
})
