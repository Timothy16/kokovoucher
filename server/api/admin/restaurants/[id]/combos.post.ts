// POST /api/admin/restaurants/:id/combos — add a combo to a restaurant's menu (admin only).
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const restaurantId = uuidParam(event, 'id')
  const input = await parseBody(event, comboSchema)
  const db = useServiceClient()

  const { data: restaurant } = await db.from('restaurants').select('name').eq('id', restaurantId).maybeSingle()
  if (!restaurant) fail(404, 'Restaurant not found.')

  const { data: combo, error } = await db
    .from('combos')
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      short_description: input.shortDescription,
      description: input.description,
      category: input.category,
      image_path: input.imagePath,
      spice_option: input.spiceOption,
      soda_options: input.sodaOptions,
      water_option: input.waterOption
    })
    .select()
    .single()
  if (error || !combo) fail(500, 'Could not add the combo. Please try again.')

  await audit({ actor: 'admin', actorId: admin.id, action: 'combo.create', targetType: 'combo', targetId: combo.id, note: `${combo.name} — ${restaurant.name}` })
  return combo
})
