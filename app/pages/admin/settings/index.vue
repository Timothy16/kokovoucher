<!-- app/pages/admin/settings/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db } = useMockDb()
const toast = useToast()

const adminEmail = ref(db.value.settings.adminEmail)
const validityDays = ref(String(db.value.settings.voucherValidityDays))
const saving = ref(false)

async function save() {
  saving.value = true
  await new Promise((r) => setTimeout(r, 350))
  db.value.settings.adminEmail = adminEmail.value.trim()
  const days = Number(validityDays.value)
  if (days > 0) db.value.settings.voucherValidityDays = days
  saving.value = false
  toast.success('Settings saved')
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Settings</h1>
      <p class="text-sm text-muted">Platform-wide configuration.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <form class="space-y-4" @submit.prevent="save">
        <BaseInput v-model="adminEmail" label="Admin notification email" type="email" icon="lucide:mail" hint="Copied on every new delivery order and dispute report." required />
        <BaseInput v-model="validityDays" label="Voucher validity (days)" type="number" icon="lucide:calendar-days" hint="New vouchers expire at the end of this many days." required />
        <BaseButton type="submit" :loading="saving">Save settings</BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
