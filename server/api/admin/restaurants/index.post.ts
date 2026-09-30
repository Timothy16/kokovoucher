// POST /api/admin/restaurants — create a restaurant and email its invite (rule 6).
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const input = await parseBody(event, createRestaurantSchema)
  const db = useServiceClient()

  // The contact email becomes the restaurant's login, so it can't already belong to someone.
  const { data: inUse, error: checkError } = await db.rpc('auth_email_in_use', { p_email: input.contactEmail })
  if (checkError) fail(500, 'Could not check that email. Please try again.')
  if (inUse) fail(409, 'This email already has a KokoSend login. Use a different contact email.')

  const { data: restaurant, error } = await db
    .from('restaurants')
    .insert({
      name: input.name,
      address: input.address,
      logo_path: input.logoPath ?? null,
      contact_person: input.contactPerson,
      contact_number: input.contactNumber,
      contact_email: input.contactEmail,
      currency: input.currency
    })
    .select()
    .single()
  if (error?.code === '23505') fail(409, 'A restaurant with this contact email already exists.')
  if (error || !restaurant) fail(500, 'Could not add the restaurant. Please try again.')

  const { inviteUrl, emailed } = await issueInvite(restaurant, false)
  await audit({ actor: 'admin', actorId: admin.id, action: 'restaurant.create', targetType: 'restaurant', targetId: restaurant.id, note: `Invited ${restaurant.name}` })

  return { id: restaurant.id, name: restaurant.name, inviteUrl, emailed }
})
