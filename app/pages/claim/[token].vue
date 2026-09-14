<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const route = useRoute()
const router = useRouter()
const { getVoucherByClaimToken } = useMockDb()

const token = route.params.token as string
const voucher = computed(() => getVoucherByClaimToken(token))
const status = computed(() => (voucher.value ? computeEffectiveStatus(voucher.value) : null))

watchEffect(() => {
  if (voucher.value && (status.value === 'active' || status.value === 'redeemed')) {
    router.replace(`/voucher/${token}`)
  }
})

const activating = ref(false)
function activate() {
  activating.value = true
  setTimeout(() => router.push(`/claim-verify/${token}`), 350)
}
</script>

<template>
  <div>
    <InvalidLink v-if="!voucher" />
    <InvalidLink v-else-if="status === 'expired'" reason="This voucher's 24-hour window has passed." />

    <BaseCard v-else class="animate-pop-in text-center">
      <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft">
        <span class="text-3xl">🎉</span>
      </div>
      <h1 class="mt-5 text-2xl font-extrabold tracking-tight text-ink">You've earned a treat!</h1>
      <p class="mt-2 text-muted">
        You earned <span class="font-bold text-ink">{{ formatCurrency(voucher.amount, voucher.currency) }}</span>
        at <span class="font-bold text-ink">{{ voucher.restaurantName }}</span>
      </p>

      <div class="mx-auto mt-6 flex max-w-xs items-center justify-center gap-2 rounded-control bg-warning-soft px-4 py-2.5 text-xs font-semibold text-warning">
        <Icon name="lucide:clock" class="size-4" />
        Expires by 11:59 PM today
      </div>

      <BaseButton size="lg" block class="mt-7" :loading="activating" @click="activate">
        Activate my voucher
        <Icon name="lucide:arrow-right" class="size-4" />
      </BaseButton>
      <p class="mt-4 text-xs text-muted">We'll text a one-time code to confirm it's you. No account needed.</p>
    </BaseCard>
  </div>
</template>
