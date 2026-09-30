// PATCH /api/admin/restaurants/:id — edit profile (rule 20). The login email is not editable.
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')
  const input = await parseBody(event, updateRestaurantSchema)
  const db = useServiceClient()

  const { data: before } = await db.from('restaurants').select('name, currency, logo_path').eq('id', id).maybeSingle()
  if (!before) fail(404, 'Restaurant not found.')

  const patch = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.address !== undefined && { address: input.address }),
    ...(input.logoPath !== undefined && { logo_path: input.logoPath }),
    ...(input.contactPerson !== undefined && { contact_person: input.contactPerson }),
    ...(input.contactNumber !== undefined && { contact_number: input.contactNumber }),
    ...(input.currency !== undefined && { currency: input.currency })
  }
  if (!Object.keys(patch).length) fail(400, 'Nothing to update.')

  const { data: restaurant, error } = await db.from('restaurants').update(patch).eq('id', id).select().single()
  if (error) {
    fail(409, currencyGuardMessage(error.message, before.name, before.currency) ?? 'Could not save changes. Please try again.')
  }

  // Replaced or removed logo: delete the old file so storage doesn't accumulate orphans.
  if (input.logoPath !== undefined && before.logo_path && before.logo_path !== input.logoPath) {
    await db.storage.from('restaurant-logos').remove([before.logo_path])
  }

  await audit({
    actor: 'admin',
    actorId: admin.id,
    action: 'restaurant.update',
    targetType: 'restaurant',
    targetId: id,
    note: `Changed: ${Object.keys(patch).join(', ')}${patch.currency && patch.currency !== before.currency ? ` (currency ${before.currency} → ${patch.currency})` : ''}`
  })

  return restaurant
})
