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
  <div class="flex flex-1 flex-col sm:block">
    <InvalidLink v-if="!voucher" />
    <InvalidLink v-else-if="status === 'expired'" reason="This voucher's 24-hour window has passed." />

    <template v-else>
      <!-- Mobile: full-bleed app screen -->
      <div class="flex flex-1 flex-col px-6 pb-8 pt-8 sm:hidden">
        <div class="flex-1">
          <span class="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-hover">
            <Icon name="lucide:utensils-crossed" class="size-6" />
          </span>

          <h1 class="mt-6 text-[30px] font-extrabold leading-[1.12] tracking-[-0.03em] text-ink">You've earned a treat 🎉</h1>

          <p class="mt-4 text-[19px] font-bold text-ink">
            {{ formatCurrency(voucher.amount, voucher.currency) }} at {{ voucher.restaurantName }}
          </p>

          <div class="mt-3 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3.5 py-1.5">
            <Icon name="lucide:clock" class="size-3.5 text-warning" />
            <span class="text-[13px] font-semibold text-ink">Expires by 11:59 PM today</span>
          </div>

          <div class="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <p class="text-[15px] leading-relaxed text-muted">
              Activate now, then show the code when you order. Nothing to download, no account needed.
            </p>
          </div>
        </div>

        <div class="pt-8">
          <BaseButton size="lg" block :loading="activating" @click="activate">Activate</BaseButton>
          <p class="mt-3 text-center text-xs text-muted">One quick check that it's really you, and it's yours.</p>
        </div>
      </div>

      <!-- Desktop: current card layout -->
      <BaseCard class="hidden animate-pop-in text-center sm:block">
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
    </template>
  </div>
</template>
