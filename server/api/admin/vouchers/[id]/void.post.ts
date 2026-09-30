// POST /api/admin/vouchers/:id/void — cancel an unused voucher (e.g. issued to the wrong username).
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')
  const { reason } = await parseBody(event, voidVoucherSchema)

  const { data: voucher, error } = await useServiceClient().rpc('void_voucher', { p_voucher_id: id, p_reason: reason ?? '' })
  if (error?.message.includes('NOT_VOIDABLE')) {
    fail(409, "Only an unused voucher that hasn't expired can be voided. If it's held by an order, cancel the order instead.")
  }
  if (error || !voucher) fail(500, 'Could not void the voucher. Please try again.')

  const email = voucherVoidedEmail({ ...voucher, amount: Number(voucher.amount) })
  const target = { recipientType: 'customer' as const, template: 'voucher_voided', related: { type: 'voucher', id } }
  await notifyEmail({ ...target, to: voucher.customer_email }, email)
  await notifyWhatsapp({ ...target, to: voucher.customer_phone }, email)
  await audit({ actor: 'admin', actorId: admin.id, action: 'voucher.void', targetType: 'voucher', targetId: id, note: voucher.void_reason })

  return { ok: true }
})
