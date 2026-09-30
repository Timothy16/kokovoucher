// POST /api/orders — public checkout: voucher code + secret key are checked last, then the
// order is placed and the voucher reserved in one transaction (rules 4, 8, 18, 24, 25).
interface Placed {
  ok: boolean
  reason?: string
  voucher_currency?: string
  order_id: string
  reference: string
  amount: number
  currency: 'NGN' | 'KES' | 'USD'
  combo_name: string
  restaurant_name: string
  restaurant_email: string
  customer_name: string
  customer_email: string
  customer_phone: string
}

export default defineEventHandler(async (event) => {
  await rateLimit(event, 'checkout', 20, 600)
  const input = await parseBody(event, placeOrderSchema)

  const { data, error } = await useServiceClient().rpc('place_order', {
    p_code: input.code,
    p_secret_key: input.secretKey,
    p_combo_id: input.comboId,
    // Generated types can't express SQL NULL for these parameters; the function handles null.
    p_spice: input.spiceLevel as 'spicy',
    p_drink: input.drinkChoice as string,
    p_delivery_name: input.deliveryName,
    p_delivery_phone: input.deliveryPhone,
    p_delivery_whatsapp: input.deliveryWhatsapp,
    p_house_name: input.houseName,
    p_house_number: input.houseNumber,
    p_floor: input.floor,
    p_landmark: input.landmark ?? '',
    p_drop: input.dropOption,
    p_additional_info: input.additionalInfo ?? ''
  })
  if (error) fail(500, 'Could not place your order. Please try again.')
  const o = data as unknown as Placed
  if (!o.ok) refuse(o)

  const site = siteUrl()
  const choices = [input.spiceLevel && SPICE_LABEL[input.spiceLevel], input.drinkChoice].filter(Boolean) as string[]
  const deliverTo = formatOrderAddress({ house_name: input.houseName, house_number: input.houseNumber, floor: input.floor, landmark: input.landmark ?? null })
  const base = {
    reference: o.reference,
    comboName: o.combo_name,
    restaurantName: o.restaurant_name,
    amount: Number(o.amount),
    currency: o.currency,
    customerName: o.customer_name,
    choices,
    deliverTo
  }
  const related = { type: 'order', id: o.order_id }

  const customerEmail = orderPlacedCustomerEmail(base, site)
  await notifyEmail({ recipientType: 'customer', to: o.customer_email, template: 'order_placed', related }, customerEmail)
  await notifyWhatsapp({ recipientType: 'customer', to: input.deliveryWhatsapp, template: 'order_placed', related }, customerEmail)
  await notifyEmail(
    { recipientType: 'restaurant', to: o.restaurant_email, template: 'order_new', related },
    orderNewRestaurantEmail({ ...base, orderId: o.order_id, deliveryName: input.deliveryName, deliveryPhone: input.deliveryPhone }, site)
  )
  const admin = await adminEmail()
  if (admin) await notifyEmail({ recipientType: 'admin', to: admin, template: 'order_new_admin', related }, orderNewAdminEmail({ ...base, orderId: o.order_id }, site))

  return { reference: o.reference }
})
