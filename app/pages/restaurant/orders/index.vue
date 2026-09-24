<!-- app/pages/restaurant/orders/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { db, currentRestaurant } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const filters = reactive({ status: '' })
const statusOptions = [
  { value: 'placed', label: 'Placed' },
  { value: 'received', label: 'Received' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' }
]

const rows = computed(() =>
  db.value.orders
    .filter((o) => o.restaurantId === currentRestaurant.value?.id)
    .filter((o) => !filters.status || o.status === filters.status)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
)

function comboName(comboId: string) {
  return db.value.combos.find((c) => c.id === comboId)?.name ?? '—'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Orders</h1>
      <p class="text-sm text-muted">{{ rows.length }} order{{ rows.length === 1 ? '' : 's' }}.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <BaseSelect v-model="filters.status" placeholder="All statuses" :options="statusOptions" class="sm:max-w-xs" />
    </BaseCard>

    <LoadingState v-if="pending" :rows="4" />
    <EmptyState v-else-if="!rows.length" icon="lucide:package" title="No orders" message="New delivery orders will show up here." />

    <div v-else class="grid gap-3">
      <NuxtLink v-for="o in rows" :key="o.id" :to="`/restaurant/orders/${o.id}`" class="block animate-fade-up">
        <BaseCard hover>
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-mono text-sm font-bold text-ink">{{ o.reference }}</p>
              <p class="truncate text-sm text-muted">{{ comboName(o.comboId) }} · {{ o.deliveryName }}</p>
            </div>
            <StatusBadge :status="o.status" />
          </div>
        </BaseCard>
      </NuxtLink>
    </div>
  </div>
</template>
