// POST /api/admin/vouchers/:id/resend — send the voucher email again (still-usable vouchers only).
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, 'admin')
  const id = uuidParam(event, 'id')

  const { data: voucher } = await useServiceClient().from('vouchers').select().eq('id', id).maybeSingle()
  if (!voucher) fail(404, 'Voucher not found.')
  const status = effectiveVoucherStatus(voucher)
  if (status !== 'issued' && status !== 'reserved') fail(409, `This voucher is ${status}, so there's nothing to resend.`)

  const emailed = await sendVoucherToCustomer(voucher, true)
  await audit({ actor: 'admin', actorId: admin.id, action: 'voucher.resend', targetType: 'voucher', targetId: id })

  return { emailed }
})
