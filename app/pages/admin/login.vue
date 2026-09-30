<!-- app/pages/admin/login.vue -->
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
  if (auth.role.value === 'admin') router.replace('/admin')
})

async function submit() {
  error.value = ''
  loading.value = true
  const res = await auth.signIn(email.value, password.value, 'admin')
  loading.value = false
  if (res.ok) {
    toast.success('Welcome back', 'Signed in to KokoSend Admin.')
    router.push('/admin')
  } else {
    error.value = res.reason === 'ERROR' ? 'Could not sign in right now. Please try again.' : 'Incorrect email or password.'
  }
}
</script>

<template>
  <BaseCard class="animate-pop-in">
    <div class="text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
        <Icon name="lucide:shield" class="size-6 text-primary" />
      </div>
      <h1 class="mt-4 text-xl font-bold text-ink">Admin login</h1>
      <p class="mt-1.5 text-sm text-muted">Manage vouchers and restaurant partners.</p>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="email" label="Email" type="email" icon="lucide:mail" required autocomplete="username" />
      <BaseInput v-model="password" label="Password" type="password" icon="lucide:lock" required autocomplete="current-password" :error="error" />
      <BaseButton type="submit" size="lg" block :loading="loading">Sign in</BaseButton>
    </form>
  </BaseCard>
</template>
