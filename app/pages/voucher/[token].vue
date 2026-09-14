<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const route = useRoute()
const router = useRouter()
const { getVoucherByClaimToken } = useMockDb()

const token = route.params.token as string
const voucher = computed(() => getVoucherByClaimToken(token))
const status = computed(() => (voucher.value ? computeEffectiveStatus(voucher.value) : null))

watchEffect(() => {
  if (voucher.value && status.value === 'issued') {
    router.replace(`/claim/${token}`)
  }
})
</script>

<template>
  <div>
    <InvalidLink v-if="!voucher" />

    <BaseCard v-else class="animate-pop-in text-center">
      <template v-if="status === 'active'">
        <BaseBadge tone="primary" pulse class="mx-auto">Active</BaseBadge>
        <p class="mt-4 text-sm text-muted">{{ voucher.restaurantName }}</p>
        <p class="text-3xl font-extrabold tracking-tight text-ink">{{ formatCurrency(voucher.amount, voucher.currency) }}</p>

        <div class="mt-5 flex justify-center">
          <QrCode :value="voucher.code" />
        </div>
        <p class="mt-4 font-mono text-2xl font-bold tracking-[0.25em] text-ink">{{ voucher.code }}</p>
        <p class="mt-1 text-xs text-muted">Show this screen at the counter</p>

        <div class="mt-5 flex justify-center">
          <CountdownBadge :expires-at="voucher.expiresAt" />
        </div>
      </template>

      <template v-else-if="status === 'redeemed'">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft animate-pop-in">
          <Icon name="lucide:check" class="size-8 text-success" />
        </div>
        <h1 class="mt-4 text-xl font-bold text-ink">All set — already redeemed</h1>
        <p class="mt-1.5 text-sm text-muted">
          {{ formatCurrency(voucher.amount, voucher.currency) }} at {{ voucher.restaurantName }}
        </p>
        <p class="mt-4 text-xs text-muted">Redeemed on {{ new Date(voucher.redeemedAt!).toLocaleString() }}</p>
      </template>

      <template v-else>
        <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-error-soft">
          <Icon name="lucide:clock-alert" class="size-7 text-error" />
        </div>
        <h1 class="mt-4 text-xl font-bold text-ink">This voucher has expired</h1>
        <p class="mt-1.5 text-sm text-muted">Its 24-hour window has passed and it can no longer be redeemed.</p>
      </template>
    </BaseCard>
  </div>
</template>
