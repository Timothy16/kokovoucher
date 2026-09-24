<!-- app/pages/restaurant/login.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const router = useRouter()
const toast = useToast()
const { loginRestaurant } = useMockDb()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  await new Promise((r) => setTimeout(r, 400))
  const res = loginRestaurant(email.value, password.value)
  loading.value = false

  if (res.reason === 'INVALID') {
    error.value = 'Incorrect email or password.'
    return
  }
  if (res.reason === 'NOT_ACTIVATED') {
    error.value = "This account hasn't accepted its invite yet. Check your email for the invite link."
    return
  }
  if (res.reason === 'DISABLED') {
    router.push('/restaurant/disabled')
    return
  }
  toast.success('Welcome back', `Signed in as ${res.restaurant?.name}.`)
  router.push('/restaurant')
}
</script>

<template>
  <BaseCard class="animate-pop-in">
    <div class="text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
        <Icon name="lucide:store" class="size-6 text-primary" />
      </div>
      <h1 class="mt-4 text-xl font-bold text-ink">Restaurant login</h1>
      <p class="mt-1.5 text-sm text-muted">Manage orders, walk-ins, and your wallet.</p>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="email" label="Email" type="email" icon="lucide:mail" required autocomplete="username" />
      <BaseInput v-model="password" label="Password" type="password" icon="lucide:lock" required autocomplete="current-password" :error="error" />
      <BaseButton type="submit" size="lg" block :loading="loading">Sign in</BaseButton>
    </form>

    <p class="mt-5 rounded-control bg-black/5 px-3.5 py-2.5 text-center text-xs text-muted">
      Demo — hello@mamaput.ng / restaurant123 (active) · info@yellowchilli.ng (invited, not yet activated)
    </p>

    <p class="mt-5 text-center text-sm text-muted">
      New restaurant? Ask KokoVoucher admin to add you — you'll get an invite link by email.
    </p>
  </BaseCard>
</template>
