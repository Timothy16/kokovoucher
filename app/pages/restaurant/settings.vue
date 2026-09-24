<!-- app/pages/restaurant/settings.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { db, currentRestaurant } = useMockDb()
const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errors = reactive<Record<string, string>>({})
const savingPassword = ref(false)

async function savePassword() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!currentRestaurant.value) return
  if (currentPassword.value !== currentRestaurant.value.password) errors.currentPassword = 'Current password is incorrect.'
  if (newPassword.value.length < 6) errors.newPassword = 'At least 6 characters.'
  if (newPassword.value !== confirmPassword.value) errors.confirmPassword = 'Passwords do not match.'
  if (Object.keys(errors).length) return

  savingPassword.value = true
  await new Promise((r) => setTimeout(r, 400))
  const r = db.value.restaurants.find((x) => x.id === currentRestaurant.value!.id)
  if (r) r.password = newPassword.value
  savingPassword.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  toast.success('Password changed')
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Profile &amp; settings</h1>
      <p class="text-sm text-muted">Your restaurant profile is managed by KokoVoucher admin.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <p class="mb-4 font-bold text-ink">Restaurant profile</p>
      <dl class="space-y-3 text-sm">
        <div class="flex justify-between"><dt class="text-muted">Name</dt><dd class="font-semibold text-ink">{{ currentRestaurant?.name }}</dd></div>
        <div class="flex justify-between"><dt class="text-muted">Address</dt><dd class="max-w-[65%] text-right font-semibold text-ink">{{ currentRestaurant?.address }}</dd></div>
        <div class="flex justify-between"><dt class="text-muted">Contact person</dt><dd class="font-semibold text-ink">{{ currentRestaurant?.contactPerson }}</dd></div>
        <div class="flex justify-between"><dt class="text-muted">Contact number</dt><dd class="font-semibold text-ink">{{ currentRestaurant?.contactNumber }}</dd></div>
        <div class="flex justify-between"><dt class="text-muted">Login email</dt><dd class="font-semibold text-ink">{{ currentRestaurant?.contactEmail }}</dd></div>
        <div class="flex justify-between"><dt class="text-muted">Currency</dt><dd class="font-semibold text-ink">{{ currentRestaurant?.currency }}</dd></div>
      </dl>
      <p class="mt-4 text-xs text-muted">Need to change any of this? Contact KokoVoucher admin.</p>
    </BaseCard>

    <BaseCard class="animate-fade-up">
      <p class="mb-4 font-bold text-ink">Change password</p>
      <form class="space-y-4" @submit.prevent="savePassword">
        <BaseInput v-model="currentPassword" label="Current password" type="password" icon="lucide:lock" :error="errors.currentPassword" />
        <BaseInput v-model="newPassword" label="New password" type="password" icon="lucide:lock" :error="errors.newPassword" />
        <BaseInput v-model="confirmPassword" label="Confirm new password" type="password" icon="lucide:lock" :error="errors.confirmPassword" />
        <BaseButton type="submit" :loading="savingPassword">Update password</BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
