<!-- app/pages/admin/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db, dashboardSummary } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 450))

const recentVouchers = computed(() =>
  [...db.value.vouchers].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6)
)
const invitedRestaurants = computed(() => db.value.restaurants.filter((r) => r.status === 'invited'))
const openDisputes = computed(() => db.value.orders.filter((o) => o.disputeReported))
const pendingByCurrency = computed(() => dashboardSummary.value.pendingByCurrency)

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Dashboard</h1>
      <p class="text-sm text-muted">Today's voucher activity at a glance.</p>
    </div>

    <LoadingState v-if="pending" :rows="4" />
    <template v-else>
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Issued today" :value="dashboardSummary.issuedToday" icon="lucide:send" tone="primary" />
        <StatCard label="Reserved" :value="dashboardSummary.reservedToday" icon="lucide:hourglass" tone="warning" />
        <StatCard label="Redeemed today" :value="dashboardSummary.redeemedToday" icon="lucide:check-check" tone="success" />
        <StatCard label="Expired today" :value="dashboardSummary.expiredToday" icon="lucide:clock-alert" tone="error" />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <BaseCard v-if="invitedRestaurants.length" class="animate-fade-up border-warning/30 !bg-warning-soft/40">
          <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-full bg-warning-soft text-warning">
                <Icon name="lucide:store" class="size-5" />
              </div>
              <div>
                <p class="font-semibold text-ink">{{ invitedRestaurants.length }} restaurant{{ invitedRestaurants.length === 1 ? '' : 's' }} yet to accept their invite</p>
                <p class="text-sm text-muted">Resend or follow up so they can go live.</p>
              </div>
            </div>
            <BaseButton size="sm" variant="secondary" @click="navigateTo('/admin/restaurants')">Review</BaseButton>
          </div>
        </BaseCard>

        <BaseCard v-if="openDisputes.length" class="animate-fade-up border-error/30 !bg-error-soft/40">
          <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-full bg-error-soft text-error">
                <Icon name="lucide:flag" class="size-5" />
              </div>
              <div>
                <p class="font-semibold text-ink">{{ openDisputes.length }} order dispute{{ openDisputes.length === 1 ? '' : 's' }} reported</p>
                <p class="text-sm text-muted">Review before processing that restaurant's payout.</p>
              </div>
            </div>
            <BaseButton size="sm" variant="secondary" @click="navigateTo('/admin/orders')">Review</BaseButton>
          </div>
        </BaseCard>

        <BaseCard v-if="Object.keys(pendingByCurrency).length" class="animate-fade-up sm:col-span-2">
          <p class="font-bold text-ink">Pending payouts</p>
          <div class="mt-3 flex flex-wrap gap-3">
            <span v-for="(amount, currency) in pendingByCurrency" :key="currency" class="rounded-control bg-black/[0.02] px-3.5 py-2 text-sm font-semibold text-ink">
              {{ formatCurrency(amount!, currency) }}
            </span>
          </div>
          <NuxtLink to="/admin/payouts" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Go to payouts
            <Icon name="lucide:arrow-right" class="size-3.5" />
          </NuxtLink>
        </BaseCard>
      </div>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4">
          <p class="font-bold text-ink">Recent vouchers</p>
        </div>
        <EmptyState v-if="!recentVouchers.length" icon="lucide:ticket" title="No vouchers yet" message="Issued vouchers will show up here." />
        <ul v-else class="divide-y divide-border">
          <li v-for="v in recentVouchers" :key="v.id" class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[0.02]">
            <Avatar :seed="v.secretKey" :size="38" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-ink">{{ v.customerFullName }}</p>
              <p class="truncate text-xs text-muted">{{ v.secretKey }} · {{ formatCurrency(v.amount, v.currency) }}</p>
            </div>
            <StatusBadge :status="computeEffectiveVoucherStatus(v)" />
            <span class="hidden w-16 shrink-0 text-right text-xs text-muted sm:block">{{ timeAgo(v.createdAt) }}</span>
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
