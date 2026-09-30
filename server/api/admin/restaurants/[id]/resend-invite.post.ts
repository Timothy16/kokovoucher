// POST /api/admin/restaurants/:id/resend-invite — new token, old link stops working (rule 21).
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')
  const db = useServiceClient()

  const { data: restaurant } = await db.from('restaurants').select().eq('id', id).maybeSingle()
  if (!restaurant) fail(404, 'Restaurant not found.')
  if (restaurant.status !== 'invited') fail(409, `${restaurant.name} has already accepted their invite.`)

  const { inviteUrl, emailed } = await issueInvite(restaurant, true)
  await db.from('restaurants').update({ invited_at: new Date().toISOString() }).eq('id', id)
  await audit({ actor: 'admin', actorId: admin.id, action: 'restaurant.invite_resend', targetType: 'restaurant', targetId: id, note: restaurant.name })

  return { inviteUrl, emailed }
})
