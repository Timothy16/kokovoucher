<!-- app/pages/restaurant/forgot-password.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const supabase = useSupabase()
const config = useRuntimeConfig()

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${config.public.siteUrl}/restaurant/reset-password`
  })
  loading.value = false
  // Same message whether or not the email has an account, so this can't be used to probe logins.
  if (sendError && sendError.status === 429) {
    error.value = 'Too many requests. Please wait a few minutes and try again.'
    return
  }
  sent.value = true
}
</script>

<template>
  <BaseCard class="animate-pop-in">
    <div class="text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
        <Icon :name="sent ? 'lucide:mail-check' : 'lucide:key-round'" class="size-6 text-primary" />
      </div>
      <h1 class="mt-4 text-xl font-bold text-ink">{{ sent ? 'Check your email' : 'Reset your password' }}</h1>
      <p class="mt-1.5 text-sm text-muted">
        {{ sent
          ? `If ${email.trim()} has a restaurant account, we've sent a link to set a new password.`
          : "Enter your restaurant's login email and we'll send you a reset link." }}
      </p>
    </div>

    <form v-if="!sent" class="mt-6 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="email" label="Email" type="email" icon="lucide:mail" required autocomplete="username" :error="error" />
      <BaseButton type="submit" size="lg" block :loading="loading">Send reset link</BaseButton>
    </form>

    <p class="mt-5 text-center text-sm">
      <NuxtLink to="/restaurant/login" class="font-semibold text-primary">Back to login</NuxtLink>
    </p>
  </BaseCard>
</template>
