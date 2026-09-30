// POST /api/admin/restaurants/:id/enable — lift a disable: status back to active, ban removed.
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')
  const db = useServiceClient()

  const { data: restaurant } = await db
    .from('restaurants')
    .update({ status: 'active', disabled_at: null })
    .eq('id', id)
    .eq('status', 'disabled')
    .select('name, user_id')
    .maybeSingle()
  if (!restaurant) fail(409, 'Only a disabled restaurant can be re-enabled.')

  if (restaurant.user_id) {
    const { error } = await db.auth.admin.updateUserById(restaurant.user_id, { ban_duration: 'none' })
    if (error) {
      // Roll back so status and login ability never disagree.
      await db.from('restaurants').update({ status: 'disabled', disabled_at: new Date().toISOString() }).eq('id', id)
      fail(500, 'Could not restore the restaurant login. Please try again.')
    }
  }

  await audit({ actor: 'admin', actorId: admin.id, action: 'restaurant.enable', targetType: 'restaurant', targetId: id, note: restaurant.name })
  return { ok: true }
})
