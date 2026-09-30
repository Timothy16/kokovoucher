<!-- app/pages/admin/settings/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()
const api = useApi()
const toast = useToast()

const form = reactive({ adminEmail: '', validityDays: '' })
const errors = reactive<Record<string, string>>({})

const { pending, error, refresh } = useAsyncData('admin-settings', async () => {
  const { data, error } = await supabase.from('settings').select().single()
  if (error) throw error
  form.adminEmail = data.admin_email
  form.validityDays = String(data.voucher_validity_days)
  return data
})

const saving = ref(false)
async function save() {
  Object.keys(errors).forEach((k) => delete errors[k])
  const days = Number(form.validityDays)
  if (!/^\S+@\S+\.\S+$/.test(form.adminEmail.trim())) errors.adminEmail = 'Enter a valid email.'
  if (!Number.isInteger(days) || days < 1 || days > 90) errors.validityDays = 'Use a whole number from 1 to 90.'
  if (Object.keys(errors).length || saving.value) return

  saving.value = true
  try {
    await api('/api/admin/settings', { method: 'PATCH', body: { adminEmail: form.adminEmail, voucherValidityDays: days } })
    toast.success('Settings saved')
    await refresh()
  } catch (e) {
    toast.error('Could not save settings', apiErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Settings</h1>
      <p class="text-sm text-muted">Platform-wide configuration. Changes are recorded in the audit log.</p>
    </div>

    <LoadingState v-if="pending && !form.adminEmail" :rows="2" />
    <ErrorState v-else-if="error" message="We couldn't load settings." @retry="refresh()" />

    <BaseCard v-else class="animate-fade-up">
      <form class="space-y-4" @submit.prevent="save">
        <BaseInput v-model="form.adminEmail" label="Admin notification email" type="email" icon="lucide:mail" hint="Gets new-order and dispute emails. Customer and restaurant replies also come here." :error="errors.adminEmail" required />
        <BaseInput v-model="form.validityDays" label="Voucher validity (days)" type="number" icon="lucide:calendar-days" hint="New vouchers expire at 23:59 UTC at the end of this many days, counting the issue day. Existing vouchers keep their date." :error="errors.validityDays" required />
        <BaseButton type="submit" :loading="saving">Save settings</BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
