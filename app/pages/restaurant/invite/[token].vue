<!-- app/pages/restaurant/invite/[token].vue -->
<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { getRestaurantByInviteToken, acceptInvite } = useMockDb()

const token = route.params.token as string
const restaurant = computed(() => getRestaurantByInviteToken(token))
const alreadyUsed = computed(() => restaurant.value && restaurant.value.status !== 'invited')

const password = ref('')
const confirmPassword = ref('')
const errors = reactive<Record<string, string>>({})
const loading = ref(false)

async function submit() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (password.value.length < 6) errors.password = 'At least 6 characters.'
  if (password.value !== confirmPassword.value) errors.confirmPassword = 'Passwords do not match.'
  if (Object.keys(errors).length) return

  loading.value = true
  await new Promise((r) => setTimeout(r, 450))
  const res = acceptInvite(token, password.value)
  loading.value = false

  if (!res.ok) {
    toast.error('Could not activate', res.error)
    return
  }
  toast.success('Welcome to KokoVoucher!', 'Your account is live.')
  router.push('/restaurant')
}
</script>

<template>
  <EmptyState v-if="!restaurant" icon="lucide:link-2-off" title="Invalid invite link" message="This invite link doesn't match a restaurant." />

  <BaseCard v-else-if="alreadyUsed" class="animate-pop-in text-center">
    <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-warning-soft">
      <Icon name="lucide:info" class="size-6 text-warning" />
    </div>
    <h1 class="mt-4 text-xl font-bold text-ink">This invite has already been used</h1>
    <p class="mt-1.5 text-sm text-muted">{{ restaurant.name }} already has an account.</p>
    <BaseButton class="mt-6" variant="secondary" @click="navigateTo('/restaurant/login')">Go to login</BaseButton>
  </BaseCard>

  <BaseCard v-else class="animate-pop-in">
    <div class="text-center">
      <Avatar :seed="restaurant.name" :size="56" />
      <h1 class="mt-4 text-xl font-bold text-ink">Welcome, {{ restaurant.name }}</h1>
      <p class="mt-1.5 text-sm text-muted">Set a password to activate your KokoVoucher account.</p>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="password" label="Set a password" type="password" icon="lucide:lock" :error="errors.password" required autocomplete="new-password" />
      <BaseInput v-model="confirmPassword" label="Confirm password" type="password" icon="lucide:lock" :error="errors.confirmPassword" required autocomplete="new-password" />
      <p class="text-xs text-muted">You'll log in with <span class="font-semibold text-ink">{{ restaurant.contactEmail }}</span>.</p>
      <BaseButton type="submit" size="lg" block :loading="loading">Activate account</BaseButton>
    </form>
  </BaseCard>
</template>
