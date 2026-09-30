// app/composables/useVoucherActions.ts
// Resend / void, shared by the vouchers list and voucher detail pages.
export function useVoucherActions(onChanged: () => unknown) {
  const api = useApi()
  const toast = useToast()
  const busy = ref<string | null>(null)

  async function resend(id: string, email: string) {
    if (busy.value) return
    busy.value = id
    try {
      const res = await api<{ emailed: boolean }>(`/api/admin/vouchers/${id}/resend`, { method: 'POST' })
      if (res.emailed) toast.success('Voucher resent', `Emailed to ${email}.`)
      else toast.warning('Email failed', 'Check the notification log and try again.')
      await onChanged()
    } catch (e) {
      toast.error('Could not resend', apiErrorMessage(e))
    } finally {
      busy.value = null
    }
  }

  // Void needs a confirmation step with an optional reason.
  const voidTarget = ref<{ id: string; code: string; secretKey: string } | null>(null)
  const voidReason = ref('')
  const voidOpen = computed({ get: () => !!voidTarget.value, set: (v: boolean) => { if (!v) voidTarget.value = null } })

  function askVoid(v: { id: string; code: string; secret_key: string }) {
    voidTarget.value = { id: v.id, code: v.code, secretKey: v.secret_key }
    voidReason.value = ''
  }

  async function confirmVoid() {
    if (!voidTarget.value || busy.value) return
    busy.value = voidTarget.value.id
    try {
      await api(`/api/admin/vouchers/${voidTarget.value.id}/void`, { method: 'POST', body: { reason: voidReason.value } })
      toast.warning('Voucher voided', 'The customer has been told by email.')
      voidTarget.value = null
      await onChanged()
    } catch (e) {
      toast.error('Could not void', apiErrorMessage(e))
    } finally {
      busy.value = null
    }
  }

  return { busy, resend, voidTarget, voidReason, voidOpen, askVoid, confirmVoid }
}
