<!-- app/pages/restaurant/login.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const router = useRouter()
const toast = useToast()
const auth = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  await auth.ready()
  if (auth.role.value === 'restaurant' && auth.restaurant.value?.status === 'active') router.replace('/restaurant')
})

async function submit() {
  error.value = ''
  loading.value = true
  const res = await auth.signIn(email.value, password.value, 'restaurant')
  loading.value = false

  if (res.ok) {
    toast.success('Welcome back', `Signed in as ${auth.restaurant.value?.name}.`)
    router.push('/restaurant')
    return
  }
  if (res.reason === 'DISABLED') {
    router.push('/restaurant/disabled')
    return
  }
  error.value =
    res.reason === 'ERROR'
      ? 'Could not sign in right now. Please try again.'
      : "Incorrect email or password. New partner? Use the invite link in your email to set up your account first."
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
      <div class="-mt-1 text-right">
        <NuxtLink to="/restaurant/forgot-password" class="text-xs font-semibold text-primary">Forgot password?</NuxtLink>
      </div>
      <BaseButton type="submit" size="lg" block :loading="loading">Sign in</BaseButton>
    </form>

    <p class="mt-5 text-center text-sm text-muted">
      New restaurant? Ask KokoSend admin to add you — you'll get an invite link by email.
    </p>
  </BaseCard>
</template>
