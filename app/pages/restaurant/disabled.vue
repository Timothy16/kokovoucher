<!-- app/pages/restaurant/disabled.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const router = useRouter()
const { session, currentRestaurant, logout } = useMockDb()

watchEffect(() => {
  if (session.value.role !== 'restaurant') router.replace('/restaurant/login')
  else if (currentRestaurant.value?.status === 'active') router.replace('/restaurant')
})

function backToLogin() {
  logout()
  router.push('/restaurant/login')
}
</script>

<template>
  <BaseCard class="animate-pop-in text-center">
    <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-error-soft">
      <Icon name="lucide:ban" class="size-7 text-error" />
    </div>
    <h1 class="mt-5 text-xl font-bold text-ink">Account disabled</h1>
    <p class="mt-2 text-sm text-muted">
      {{ currentRestaurant?.name ?? 'This account' }} has been disabled by KokoVoucher admin and can't log in or receive orders right now.
      Contact support if you think this is a mistake.
    </p>
    <BaseButton class="mt-6" variant="secondary" @click="backToLogin">Back to login</BaseButton>
  </BaseCard>
</template>
