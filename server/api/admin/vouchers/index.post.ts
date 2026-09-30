// POST /api/admin/vouchers — issue a voucher to a customer and send it (rules 2, 3, 19).
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const input = await parseBody(event, issueVoucherSchema)

  const { data: voucher, error } = await useServiceClient().rpc('issue_voucher', {
    p_full_name: input.customerFullName,
    p_phone: input.customerPhone,
    p_email: input.customerEmail,
    p_secret_key: input.secretKey,
    p_currency: input.currency,
    p_amount: input.amount,
    p_created_by: admin.id
  })
  if (error?.message.includes('ACTIVE_VOUCHER_EXISTS')) {
    fail(409, 'This KokoSend username already has an active voucher. It can get a new one once that is redeemed, expires or is voided.')
  }
  if (error || !voucher) fail(500, 'Could not issue the voucher. Please try again.')

  const emailed = await sendVoucherToCustomer(voucher, false)
  await audit({
    actor: 'admin',
    actorId: admin.id,
    action: 'voucher.issue',
    targetType: 'voucher',
    targetId: voucher.id,
    note: `${formatCurrency(Number(voucher.amount), voucher.currency)} to ${voucher.secret_key}`
  })

  return { id: voucher.id, code: voucher.code, amount: Number(voucher.amount), currency: voucher.currency, secretKey: voucher.secret_key, emailed }
})
