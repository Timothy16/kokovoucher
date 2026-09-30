<!-- app/pages/restaurant/invite/[token].vue -->
<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from '#shared/types/models'

definePageMeta({ layout: 'customer' })

type InviteInfo =
  | { state: 'valid'; restaurantName: string; email: string }
  | { state: 'invalid' | 'used' | 'replaced' | 'expired' }

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuth()
const api = useApi()

const token = route.params.token as string
const info = ref<InviteInfo | null>(null)
const loadError = ref(false)

async function load() {
  loadError.value = false
  try {
    info.value = await api<InviteInfo>(`/api/invites/${encodeURIComponent(token)}`)
  } catch {
    loadError.value = true
  }
}
onMounted(load)

const deadEnds: Record<Exclude<InviteInfo['state'], 'valid'>, { icon: string; title: string; message: string }> = {
  invalid: { icon: 'lucide:link-2-off', title: 'Invalid invite link', message: "This link doesn't match an invite. Check you copied the whole link from the email." },
  used: { icon: 'lucide:info', title: 'This invite has already been used', message: 'Your account is already set up — log in with your email and password.' },
  replaced: { icon: 'lucide:refresh-cw', title: 'This invite link was replaced', message: 'A newer invite was sent to your email. Use the link in the most recent email.' },
  expired: { icon: 'lucide:clock-alert', title: 'This invite link has expired', message: 'Ask KokoSend admin to resend your invite.' }
}

const password = ref('')
const confirmPassword = ref('')
const errors = reactive<Record<string, string>>({})
const loading = ref(false)

async function submit() {
  if (info.value?.state !== 'valid') return
  Object.keys(errors).forEach((k) => delete errors[k])
  if (password.value.length < MIN_PASSWORD_LENGTH) errors.password = `At least ${MIN_PASSWORD_LENGTH} characters.`
  if (password.value !== confirmPassword.value) errors.confirmPassword = 'Passwords do not match.'
  if (Object.keys(errors).length) return

  loading.value = true
  try {
    const { email } = await api<{ email: string }>('/api/invites/accept', { method: 'POST', body: { token, password: password.value } })
    const signedIn = await auth.signIn(email, password.value, 'restaurant')
    toast.success('Welcome to KokoSend!', 'Your account is live.')
    router.push(signedIn.ok ? '/restaurant' : '/restaurant/login')
  } catch (e) {
    toast.error('Could not activate', apiErrorMessage(e))
    await load()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <LoadingState v-if="!info && !loadError" :rows="2" />
  <ErrorState v-else-if="loadError" message="We couldn't check this invite link." @retry="load" />

  <BaseCard v-else-if="info && info.state !== 'valid'" class="animate-pop-in text-center">
    <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-warning-soft">
      <Icon :name="deadEnds[info.state].icon" class="size-6 text-warning" />
    </div>
    <h1 class="mt-4 text-xl font-bold text-ink">{{ deadEnds[info.state].title }}</h1>
    <p class="mt-1.5 text-sm text-muted">{{ deadEnds[info.state].message }}</p>
    <BaseButton class="mt-6" variant="secondary" @click="navigateTo('/restaurant/login')">Go to login</BaseButton>
  </BaseCard>

  <BaseCard v-else-if="info" class="animate-pop-in">
    <div class="text-center">
      <Avatar :seed="info.restaurantName" :size="56" class="mx-auto" />
      <h1 class="mt-4 text-xl font-bold text-ink">Welcome, {{ info.restaurantName }}</h1>
      <p class="mt-1.5 text-sm text-muted">Set a password to activate your KokoSend account.</p>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="password" label="Set a password" type="password" icon="lucide:lock" :hint="`At least ${MIN_PASSWORD_LENGTH} characters.`" :error="errors.password" required autocomplete="new-password" />
      <BaseInput v-model="confirmPassword" label="Confirm password" type="password" icon="lucide:lock" :error="errors.confirmPassword" required autocomplete="new-password" />
      <p class="text-xs text-muted">You'll log in with <span class="font-semibold text-ink">{{ info.email }}</span>.</p>
      <BaseButton type="submit" size="lg" block :loading="loading">Activate account</BaseButton>
    </form>
  </BaseCard>
</template>
