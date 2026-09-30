// PATCH /api/combos/:id/availability — rule 13: mark a combo available / sold out.
// Admin may toggle any combo; a restaurant only its own, and only while active.
import { z } from 'zod'

const schema = z.object({ available: z.boolean({ error: 'Say whether the combo is available.' }) })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = uuidParam(event, 'id')
  const { available } = await parseBody(event, schema)
  const db = useServiceClient()

  const { data: combo } = await db.from('combos').select('restaurant_id').eq('id', id).maybeSingle()
  if (!combo) fail(404, 'Combo not found.')

  const role = user.app_metadata?.role
  if (role === 'restaurant') {
    const restaurant = await activeRestaurantOf(user)
    // Same response as a missing combo, so restaurants can't probe other menus.
    if (combo.restaurant_id !== restaurant.id) fail(404, 'Combo not found.')
  } else if (role !== 'admin') {
    fail(403, 'You do not have access to this.')
  }

  const { data: updated, error } = await db.from('combos').update({ available }).eq('id', id).select('id, available').single()
  if (error || !updated) fail(500, 'Could not update availability. Please try again.')
  return updated
})
