<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { db, currentRestaurant } = useMockDb()
const toast = useToast()

const name = ref(currentRestaurant.value?.name ?? '')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errors = reactive<Record<string, string>>({})
const savingName = ref(false)
const savingPassword = ref(false)

async function saveName() {
  if (!currentRestaurant.value || !name.value.trim()) return
  savingName.value = true
  await new Promise((r) => setTimeout(r, 400))
  const r = db.value.restaurants.find((x) => x.id === currentRestaurant.value!.id)
  if (r) r.name = name.value.trim()
  savingName.value = false
  toast.success('Restaurant name updated')
}

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
      <p class="text-sm text-muted">Manage your restaurant's details.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <p class="mb-4 font-bold text-ink">Restaurant name</p>
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit.prevent="saveName">
        <div class="flex-1"><BaseInput v-model="name" label="Name" icon="lucide:store" required /></div>
        <BaseButton type="submit" :loading="savingName">Save</BaseButton>
      </form>
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
