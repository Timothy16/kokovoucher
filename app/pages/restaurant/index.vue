<!-- app/pages/restaurant/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { db, currentRestaurant, pendingBalance } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const restaurantId = computed(() => currentRestaurant.value?.id ?? '')

const openOrders = computed(() =>
  db.value.orders.filter((o) => o.restaurantId === restaurantId.value && (o.status === 'placed' || o.status === 'received' || o.status === 'dispatched'))
)
const newOrders = computed(() => openOrders.value.filter((o) => o.status === 'placed'))
const balance = computed(() => (currentRestaurant.value ? pendingBalance(currentRestaurant.value.id) : 0))
const recentOrders = computed(() =>
  [...db.value.orders].filter((o) => o.restaurantId === restaurantId.value).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5)
)

function comboName(comboId: string) {
  return db.value.combos.find((c) => c.id === comboId)?.name ?? '—'
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Welcome back{{ currentRestaurant ? `, ${currentRestaurant.name}` : '' }}</h1>
      <p class="text-sm text-muted">Here's what's happening today.</p>
    </div>

    <LoadingState v-if="pending" :rows="3" />
    <template v-else>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="New orders" :value="newOrders.length" icon="lucide:bell" tone="warning" />
        <StatCard label="Open orders" :value="openOrders.length" icon="lucide:package" tone="primary" />
        <StatCard label="Pending payout" :value="currentRestaurant ? formatCurrency(balance, currentRestaurant.currency) : '—'" icon="lucide:wallet" tone="success" />
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <NuxtLink to="/restaurant/orders" class="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
          <Icon name="lucide:package" class="size-5 text-primary" />
          <span class="font-semibold text-ink">Manage orders</span>
        </NuxtLink>
        <NuxtLink to="/restaurant/walk-in" class="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
          <Icon name="lucide:qr-code" class="size-5 text-primary" />
          <span class="font-semibold text-ink">Redeem a walk-in</span>
        </NuxtLink>
        <NuxtLink to="/restaurant/menu" class="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
          <Icon name="lucide:utensils-crossed" class="size-5 text-primary" />
          <span class="font-semibold text-ink">Update menu</span>
        </NuxtLink>
      </div>

      <BaseCard :padded="false" class="overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Recent orders</p></div>
        <EmptyState v-if="!recentOrders.length" icon="lucide:package" title="No orders yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="o in recentOrders" :key="o.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <NuxtLink :to="`/restaurant/orders/${o.id}`" class="min-w-0">
              <p class="font-mono text-sm font-semibold text-ink hover:text-primary">{{ o.reference }}</p>
              <p class="truncate text-xs text-muted">{{ comboName(o.comboId) }}</p>
            </NuxtLink>
            <StatusBadge :status="o.status" />
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
