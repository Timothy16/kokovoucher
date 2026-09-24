<!-- app/pages/restaurant/wallet.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { db, currentRestaurant, pendingBalance, payoutHistory } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const restaurantId = computed(() => currentRestaurant.value?.id ?? '')
const balance = computed(() => (currentRestaurant.value ? pendingBalance(currentRestaurant.value.id) : 0))
const history = computed(() => (currentRestaurant.value ? payoutHistory(currentRestaurant.value.id) : []))

const ledger = computed(() =>
  db.value.payoutItems.filter((i) => i.restaurantId === restaurantId.value).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
)

function sourceLabel(item: (typeof ledger.value)[number]) {
  if (item.sourceType === 'walk_in') {
    const w = db.value.walkIns.find((x) => x.id === item.sourceId)
    return w ? `Walk-in redemption` : 'Walk-in'
  }
  const o = db.value.orders.find((x) => x.id === item.sourceId)
  return o ? `Delivery · ${o.reference}` : 'Delivery order'
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Wallet</h1>
      <p class="text-sm text-muted">Delivered orders and completed walk-ins credit this wallet. Admin pays out in batches.</p>
    </div>

    <LoadingState v-if="pending" :rows="3" />
    <template v-else>
      <BaseCard class="animate-fade-up !bg-primary text-white">
        <p class="text-sm text-white/80">Pending balance</p>
        <p class="mt-1 text-3xl font-extrabold">{{ currentRestaurant ? formatCurrency(balance, currentRestaurant.currency) : '—' }}</p>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Ledger</p></div>
        <EmptyState v-if="!ledger.length" icon="lucide:receipt" title="No activity yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="item in ledger" :key="item.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-ink">{{ sourceLabel(item) }}</p>
              <p class="text-xs text-muted">
                {{ new Date(item.createdAt).toLocaleString() }}
                <span v-if="item.status === 'revoked' && item.revokeReason"> · {{ item.revokeReason }}</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <span class="font-semibold" :class="item.status === 'revoked' ? 'text-muted line-through' : 'text-ink'">{{ formatCurrency(item.amount, item.currency) }}</span>
              <StatusBadge :status="item.status" />
            </div>
          </li>
        </ul>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Payout history</p></div>
        <EmptyState v-if="!history.length" icon="lucide:banknote" title="No payouts yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="p in history" :key="p.id" class="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
            <div>
              <p class="font-semibold text-ink">{{ new Date(p.processedAt).toLocaleString() }}</p>
              <p class="text-xs text-muted">{{ p.itemCount }} item{{ p.itemCount === 1 ? '' : 's' }}{{ p.reference ? ` · ${p.reference}` : '' }}</p>
            </div>
            <span class="font-semibold text-ink">{{ formatCurrency(p.totalAmount, p.currency) }}</span>
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
