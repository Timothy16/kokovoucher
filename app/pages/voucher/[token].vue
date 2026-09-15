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

const { label: countdownLabel } = useCountdown(computed(() => voucher.value?.expiresAt ?? new Date().toISOString()))
</script>

<template>
  <div class="flex flex-1 flex-col sm:block">
    <InvalidLink v-if="!voucher" />

    <template v-else>
      <!-- Mobile: full-bleed app screen -->
      <div class="flex flex-1 flex-col px-6 pb-8 pt-8 sm:hidden">
        <div class="flex-1">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your voucher</p>
              <p class="mt-1 truncate text-[17px] font-bold text-ink">{{ voucher.restaurantName }}</p>
            </div>
            <span v-if="status === 'redeemed'" class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-bold text-success">
              <Icon name="lucide:circle-check-big" class="size-3.5" />
              Redeemed
            </span>
            <span v-else-if="status === 'expired'" class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-error-soft px-3 py-1.5 text-xs font-bold text-error">
              <Icon name="lucide:circle-x" class="size-3.5" />
              Expired
            </span>
            <span v-else class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary-hover">
              <Icon name="lucide:clock" class="size-3.5" />
              Active
            </span>
          </div>

          <div class="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-soft" :class="status === 'active' ? '' : 'opacity-60 saturate-0'">
            <div class="relative">
              <QrCode :value="voucher.code" />
              <div v-if="status !== 'active'" class="absolute inset-0 grid place-items-center">
                <span class="rounded-full px-4 py-2 text-[13px] font-bold text-white" :class="status === 'redeemed' ? 'bg-success' : 'bg-error'">
                  {{ status === 'redeemed' ? 'Redeemed' : 'Expired' }}
                </span>
              </div>
            </div>

            <div class="mt-5 text-center">
              <p class="text-xs font-medium text-muted">Show this code</p>
              <p class="mt-1 font-mono text-[26px] font-bold tracking-[0.14em] text-ink">{{ voucher.code }}</p>
            </div>
          </div>

          <dl class="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
            <div class="flex items-center justify-between px-5 py-3.5">
              <dt class="text-sm text-muted">Value</dt>
              <dd class="text-[17px] font-extrabold" :class="status === 'active' ? 'text-ink' : 'text-muted'">
                {{ formatCurrency(voucher.amount, voucher.currency) }}
              </dd>
            </div>
            <div class="flex items-center justify-between px-5 py-3.5">
              <dt class="text-sm text-muted">Restaurant</dt>
              <dd class="text-sm font-semibold text-ink">{{ voucher.restaurantName }}</dd>
            </div>
            <div class="flex items-center justify-between px-5 py-3.5">
              <dt class="text-sm text-muted">{{ status === 'expired' ? 'Expired' : 'Expires in' }}</dt>
              <dd>
                <span v-if="status === 'active'" class="font-mono text-[15px] font-bold tabular-nums text-ink">{{ countdownLabel }}</span>
                <span v-else class="text-sm font-semibold text-muted">
                  {{ status === 'redeemed' ? new Date(voucher.redeemedAt!).toLocaleString() : new Date(voucher.expiresAt).toLocaleString() }}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <p class="pt-6 text-center text-[13px] leading-relaxed text-muted">
          <template v-if="status === 'active'">Keep this screen open at the counter. The code works once, so only show it when you're paying.</template>
          <template v-else-if="status === 'redeemed'">Enjoy your meal — this voucher has already been used. New rewards land in your bank app.</template>
          <template v-else>This one ran out of time. Keep an eye on your bank app — another treat is usually close behind.</template>
        </p>
      </div>

      <!-- Desktop: current card layout -->
      <BaseCard class="hidden animate-pop-in text-center sm:block">
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
    </template>
  </div>
</template>
