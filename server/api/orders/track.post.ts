// POST /api/orders/track — public. Order reference + secret key → the order's progress.
// A wrong reference and a wrong key get the same answer, so neither can be probed alone.
export default defineEventHandler(async (event) => {
  await rateLimit(event, 'track', 30, 600)
  const { reference, secretKey } = await parseBody(event, trackSchema)
  const db = useServiceClient()

  const { data: o } = await db
    .from('orders')
    .select('id, reference, status, amount, currency, spice_level, drink_choice, delivery_name, house_name, house_number, floor, landmark, drop_option, dispute_status, created_at, vouchers(status, secret_key_normalized), combos(name), restaurants(name)')
    .eq('reference', reference.toUpperCase())
    .maybeSingle()

  if (!o || !o.vouchers || o.vouchers.secret_key_normalized !== secretKey.trim().toLowerCase()) {
    fail(404, "We couldn't find an order with that reference and secret key. Check both and try again.")
  }

  const { data: history } = await db.from('order_status_history').select('status, at, note').eq('order_id', o.id).order('at').order('id')

  return {
    reference: o.reference,
    status: o.status,
    amount: Number(o.amount),
    currency: o.currency,
    comboName: o.combos?.name ?? null,
    restaurantName: o.restaurants?.name ?? null,
    deliveryName: o.delivery_name,
    address: formatOrderAddress(o),
    dropOption: o.drop_option,
    spiceLevel: o.spice_level,
    drinkChoice: o.drink_choice,
    disputeStatus: o.dispute_status,
    createdAt: o.created_at,
    // After a cancel/reject: can the customer use their voucher again?
    voucherUsableAgain: (o.status === 'cancelled' || o.status === 'rejected') && o.vouchers.status === 'issued',
    history: history ?? []
  }
})
