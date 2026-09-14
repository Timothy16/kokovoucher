<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const router = useRouter()
const toast = useToast()
const { registerRestaurant } = useMockDb()

const form = reactive({ name: '', email: '', password: '' })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name.trim()) errors.name = 'Enter your restaurant name.'
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email.'
  if (form.password.length < 6) errors.password = 'At least 6 characters.'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  loading.value = true
  await new Promise((r) => setTimeout(r, 450))
  const res = registerRestaurant(form)
  loading.value = false
  if (!res.ok) {
    errors.email = res.error ?? 'Something went wrong.'
    toast.error('Registration failed', res.error)
    return
  }
  toast.success('Registration received', "We'll notify you once approved.")
  router.push('/restaurant/pending')
}
</script>

<template>
  <BaseCard class="animate-pop-in">
    <div class="text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
        <Icon name="lucide:store" class="size-6 text-primary" />
      </div>
      <h1 class="mt-4 text-xl font-bold text-ink">Register your restaurant</h1>
      <p class="mt-1.5 text-sm text-muted">Join the KokoVoucher network in minutes.</p>
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="form.name" label="Restaurant name" icon="lucide:store" :error="errors.name" required />
      <BaseInput v-model="form.email" label="Email" type="email" icon="lucide:mail" :error="errors.email" required autocomplete="username" />
      <BaseInput v-model="form.password" label="Password" type="password" icon="lucide:lock" :error="errors.password" required autocomplete="new-password" />
      <BaseButton type="submit" size="lg" block :loading="loading">Register</BaseButton>
    </form>

    <p class="mt-5 text-center text-sm text-muted">
      Already registered?
      <NuxtLink to="/restaurant/login" class="font-semibold text-primary">Log in</NuxtLink>
    </p>
  </BaseCard>
</template>
