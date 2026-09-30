// server/utils/audit.ts
// Rule 17: every sensitive action is recorded. A failed audit write is logged, not fatal —
// the action itself has already happened and must not be reported as failed.
export async function audit(entry: {
  actor: string
  actorId: string | null
  action: string
  targetType: string
  targetId: string
  note?: string | null
}) {
  const { error } = await useServiceClient().from('audit_log').insert({
    actor: entry.actor,
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    note: entry.note ?? null
  })
  if (error) console.error('[audit] failed to record', entry.action, error.message)
}
