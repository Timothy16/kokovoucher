<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db, dashboardSummary } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 450))

const recent = computed(() =>
  [...db.value.vouchers].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6)
)
const pendingRestaurants = computed(() => db.value.restaurants.filter((r) => r.status === 'pending'))

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
        <StatCard label="Issued today" :value="dashboardSummary.issued" icon="lucide:send" tone="primary" />
        <StatCard label="Active" :value="dashboardSummary.active" icon="lucide:zap" tone="primary" />
        <StatCard label="Redeemed" :value="dashboardSummary.redeemed" icon="lucide:check-check" tone="success" />
        <StatCard label="Expired" :value="dashboardSummary.expired" icon="lucide:clock-alert" tone="error" />
      </div>

      <BaseCard v-if="pendingRestaurants.length" class="animate-fade-up border-warning/30 bg-warning-soft/40">
        <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-full bg-warning-soft text-warning">
              <Icon name="lucide:store" class="size-5" />
            </div>
            <div>
              <p class="font-semibold text-ink">{{ pendingRestaurants.length }} restaurant{{ pendingRestaurants.length === 1 ? '' : 's' }} waiting for approval</p>
              <p class="text-sm text-muted">Review and approve to let them start redeeming vouchers.</p>
            </div>
          </div>
          <BaseButton size="sm" variant="secondary" @click="navigateTo('/admin/restaurants')">Review now</BaseButton>
        </div>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4">
          <p class="font-bold text-ink">Recent activity</p>
        </div>
        <EmptyState v-if="!recent.length" icon="lucide:ticket" title="No vouchers yet" message="Generated vouchers will show up here." />
        <ul v-else class="divide-y divide-border">
          <li v-for="v in recent" :key="v.id" class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[0.02]">
            <Avatar :seed="v.customerEmail" :size="38" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-ink">{{ v.customerEmail }}</p>
              <p class="truncate text-xs text-muted">{{ v.restaurantName }} · {{ formatCurrency(v.amount, v.currency) }}</p>
            </div>
            <StatusBadge :status="computeEffectiveStatus(v)" />
            <span class="hidden w-16 shrink-0 text-right text-xs text-muted sm:block">{{ timeAgo(v.createdAt) }}</span>
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
