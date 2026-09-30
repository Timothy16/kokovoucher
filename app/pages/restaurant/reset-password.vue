<!-- app/pages/restaurant/reset-password.vue -->
<!-- Landing page for the emailed reset link. Supabase signs the user in from the link
     (recovery session); we then let them set a new password. -->
<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from '#shared/types/models'

definePageMeta({ layout: 'customer' })

// Only a genuine recovery link unlocks this form — an ordinary signed-in session must use
// Settings, which asks for the current password.
const linkParams = authLandingParams()
const isRecoveryLink = linkParams.get('type') === 'recovery' && !linkParams.get('error_code')

const router = useRouter()
const toast = useToast()
const supabase = useSupabase()
const auth = useAuth()

const checking = ref(true)
const linkValid = ref(false)

onMounted(async () => {
  await auth.ready()
  linkValid.value = isRecoveryLink && !!auth.user.value
  checking.value = false
})

const password = ref('')
const confirmPassword = ref('')
const errors = reactive<Record<string, string>>({})
const saving = ref(false)

async function submit() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (password.value.length < MIN_PASSWORD_LENGTH) errors.password = `At least ${MIN_PASSWORD_LENGTH} characters.`
  if (password.value !== confirmPassword.value) errors.confirmPassword = 'Passwords do not match.'
  if (Object.keys(errors).length) return

  saving.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value })
  saving.value = false
  if (error) {
    errors.password = error.code === 'same_password' ? 'Choose a password different from your current one.' : 'Could not update your password. Request a new reset link and try again.'
    return
  }
  // Sign out so they log in fresh with the new password (and a disabled account can't slip in).
  await auth.signOut()
  toast.success('Password updated', 'Log in with your new password.')
  router.push('/restaurant/login')
}
</script>

<template>
  <LoadingState v-if="checking" :rows="2" />

  <BaseCard v-else-if="!linkValid" class="animate-pop-in text-center">
    <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-warning-soft">
      <Icon name="lucide:clock-alert" class="size-6 text-warning" />
    </div>
    <h1 class="mt-4 text-xl font-bold text-ink">This reset link has expired</h1>
    <p class="mt-1.5 text-sm text-muted">Reset links work once and expire after a short time. Request a new one.</p>
    <BaseButton class="mt-6" @click="navigateTo('/restaurant/forgot-password')">Send a new link</BaseButton>
  </BaseCard>

  <BaseCard v-else class="animate-pop-in">
    <div class="text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
        <Icon name="lucide:key-round" class="size-6 text-primary" />
      </div>
      <h1 class="mt-4 text-xl font-bold text-ink">Set a new password</h1>
      <p class="mt-1.5 text-sm text-muted">For {{ auth.user.value?.email }}</p>
    </div>
    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="password" label="New password" type="password" icon="lucide:lock" :hint="`At least ${MIN_PASSWORD_LENGTH} characters.`" :error="errors.password" required autocomplete="new-password" />
      <BaseInput v-model="confirmPassword" label="Confirm new password" type="password" icon="lucide:lock" :error="errors.confirmPassword" required autocomplete="new-password" />
      <BaseButton type="submit" size="lg" block :loading="saving">Update password</BaseButton>
    </form>
  </BaseCard>
</template>
