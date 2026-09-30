<!-- app/pages/restaurant/settings.vue -->
<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from '#shared/types/models'

definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const supabase = useSupabase()
const { restaurant } = useAuth()
const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errors = reactive<Record<string, string>>({})
const savingPassword = ref(false)

async function savePassword() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!restaurant.value) return
  if (!currentPassword.value) errors.currentPassword = 'Enter your current password.'
  if (newPassword.value.length < MIN_PASSWORD_LENGTH) errors.newPassword = `At least ${MIN_PASSWORD_LENGTH} characters.`
  if (newPassword.value !== confirmPassword.value) errors.confirmPassword = 'Passwords do not match.'
  if (Object.keys(errors).length) return

  savingPassword.value = true
  try {
    // Re-check the current password before allowing a change (an unattended open session
    // shouldn't be enough to take over the account).
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: restaurant.value.contact_email, password: currentPassword.value })
    if (reauthError) {
      errors.currentPassword = 'Current password is incorrect.'
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) {
      errors.newPassword = error.code === 'same_password' ? 'Choose a password different from your current one.' : 'Could not update your password. Please try again.'
      return
    }
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast.success('Password changed')
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Profile &amp; settings</h1>
      <p class="text-sm text-muted">Your restaurant profile is managed by KokoSend admin.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <p class="mb-4 font-bold text-ink">Restaurant profile</p>
      <dl class="space-y-3 text-sm">
        <div class="flex justify-between gap-4"><dt class="text-muted">Name</dt><dd class="text-right font-semibold text-ink">{{ restaurant?.name }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Address</dt><dd class="max-w-[65%] text-right font-semibold text-ink">{{ restaurant?.address }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Contact person</dt><dd class="text-right font-semibold text-ink">{{ restaurant?.contact_person }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Contact number</dt><dd class="text-right font-semibold text-ink">{{ restaurant?.contact_number }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Login email</dt><dd class="truncate text-right font-semibold text-ink">{{ restaurant?.contact_email }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Currency</dt><dd class="text-right font-semibold text-ink">{{ restaurant?.currency }}</dd></div>
      </dl>
      <p class="mt-4 text-xs text-muted">Need to change any of this? Contact KokoSend admin.</p>
    </BaseCard>

    <BaseCard class="animate-fade-up">
      <p class="mb-4 font-bold text-ink">Change password</p>
      <form class="space-y-4" @submit.prevent="savePassword">
        <BaseInput v-model="currentPassword" label="Current password" type="password" icon="lucide:lock" :error="errors.currentPassword" autocomplete="current-password" />
        <BaseInput v-model="newPassword" label="New password" type="password" icon="lucide:lock" :hint="`At least ${MIN_PASSWORD_LENGTH} characters.`" :error="errors.newPassword" autocomplete="new-password" />
        <BaseInput v-model="confirmPassword" label="Confirm new password" type="password" icon="lucide:lock" :error="errors.confirmPassword" autocomplete="new-password" />
        <BaseButton type="submit" :loading="savingPassword">Update password</BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
