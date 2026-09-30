// POST /api/orders/report — public. "Didn't receive it?" on a delivered order. Flags a dispute
// for admin; it never reverses anything automatically.
export default defineEventHandler(async (event) => {
  await rateLimit(event, 'report', 10, 600)
  const { reference, secretKey, note } = await parseBody(event, reportSchema)

  const { data, error } = await useServiceClient().rpc('report_order_problem', { p_reference: reference, p_secret_key: secretKey, p_note: note ?? '' })
  if (error) fail(500, 'Could not send your report. Please try again.')
  const r = data as unknown as { ok: boolean; reason?: string; order_id: string; reference: string; restaurant_name: string }

  if (!r.ok) {
    if (r.reason === 'NOT_DELIVERED') fail(409, 'You can report a problem once the order is marked delivered.')
    if (r.reason === 'ALREADY_REPORTED') fail(409, 'A problem has already been reported for this order. Our team is on it.')
    fail(404, "We couldn't find an order with that reference and secret key.")
  }

  const admin = await adminEmail()
  if (admin) {
    await notifyEmail(
      { recipientType: 'admin', to: admin, template: 'order_disputed', related: { type: 'order', id: r.order_id } },
      disputeReportedAdminEmail({ orderId: r.order_id, reference: r.reference, restaurantName: r.restaurant_name, note: note?.trim() || null }, siteUrl())
    )
  }
  return { ok: true }
})
