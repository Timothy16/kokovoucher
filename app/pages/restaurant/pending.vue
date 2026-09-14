<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const router = useRouter()
const { session, currentRestaurant, logout } = useMockDb()

watchEffect(() => {
  if (session.value.role !== 'restaurant') router.replace('/restaurant/login')
  else if (currentRestaurant.value?.status === 'approved') router.replace('/restaurant/redeem')
})

function backToLogin() {
  logout()
  router.push('/restaurant/login')
}
</script>

<template>
  <BaseCard class="animate-pop-in text-center">
    <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-warning-soft">
      <Icon name="lucide:hourglass" class="size-7 text-warning animate-pulse-soft" />
    </div>
    <h1 class="mt-5 text-xl font-bold text-ink">Waiting on approval</h1>
    <p class="mt-2 text-sm text-muted">
      Thanks for registering{{ currentRestaurant ? `, ${currentRestaurant.name}` : '' }}! An admin needs to approve your
      account before you can redeem vouchers. This usually takes less than a day.
    </p>
    <BaseButton class="mt-6" variant="secondary" @click="backToLogin">Back to login</BaseButton>
  </BaseCard>
</template>
