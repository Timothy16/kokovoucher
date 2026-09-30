// POST /api/admin/restaurants/:id/disable — lock the restaurant out and release its in-flight
// orders (rule 22). Access is cut three ways: status (RLS stops returning its data at once),
// an auth ban (no new sign-ins or token refreshes), and the public menu view hides it.

const BAN_FOREVER = '876000h' // ~100 years; lifted by /enable

interface ReleasedOrder {
  order_id: string
  reference: string
  customer_email: string
  customer_phone: string
  voucher_released: boolean
}

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')
  const db = useServiceClient()

  const { data: restaurant } = await db.from('restaurants').select('name, user_id').eq('id', id).maybeSingle()
  if (!restaurant) fail(404, 'Restaurant not found.')

  const { data, error } = await db.rpc('disable_restaurant', { p_restaurant_id: id })
  if (error?.message.includes('RESTAURANT_NOT_ACTIVE')) fail(409, `${restaurant.name} is not active.`)
  if (error) fail(500, 'Could not disable the restaurant. Please try again.')
  const released = (data ?? []) as unknown as ReleasedOrder[]

  if (restaurant.user_id) {
    const { error: banError } = await db.auth.admin.updateUserById(restaurant.user_id, { ban_duration: BAN_FOREVER })
    // Not fatal: the disabled status alone already blocks all data access via RLS.
    if (banError) console.error('[disable] could not ban auth user', id, banError.message)
  }

  const site = useRuntimeConfig().public.siteUrl
  for (const order of released) {
    const target = { recipientType: 'customer' as const, template: 'order_cancelled', related: { type: 'order', id: order.order_id } }
    const email = orderNotCompletedEmail({ reference: order.reference, restaurantName: restaurant.name, voucherReleased: order.voucher_released, reason: 'restaurant_disabled' }, site)
    await notifyEmail({ ...target, to: order.customer_email }, email)
    await notifyWhatsapp({ ...target, to: order.customer_phone }, email)
  }

  await audit({
    actor: 'admin',
    actorId: admin.id,
    action: 'restaurant.disable',
    targetType: 'restaurant',
    targetId: id,
    note: `${restaurant.name}${released.length ? ` — released ${released.length} in-flight order${released.length === 1 ? '' : 's'}` : ''}`
  })

  return { releasedOrders: released.length }
})
