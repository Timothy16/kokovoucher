// PATCH /api/admin/combos/:id — edit a combo (admin only). Availability has its own route.
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')
  const input = await parseBody(event, comboUpdateSchema)
  const db = useServiceClient()

  const patch = comboColumns(input)
  if (!Object.keys(patch).length) fail(400, 'Nothing to update.')

  const { data: before } = await db.from('combos').select('image_path').eq('id', id).maybeSingle()
  if (!before) fail(404, 'Combo not found.')

  const { data: combo, error } = await db.from('combos').update(patch).eq('id', id).select().single()
  if (error || !combo) fail(500, 'Could not save the combo. Please try again.')

  // Replaced photo: delete the old file so storage doesn't accumulate orphans.
  if (input.imagePath && input.imagePath !== before.image_path) {
    await db.storage.from('combo-images').remove([before.image_path])
  }

  await audit({ actor: 'admin', actorId: admin.id, action: 'combo.update', targetType: 'combo', targetId: id, note: `${combo.name} — changed: ${Object.keys(patch).join(', ')}` })
  return combo
})
