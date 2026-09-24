<!-- app/pages/admin/orders/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const filters = reactive({ status: '', restaurantId: '', disputed: '' })

const statusOptions = [
  { value: 'placed', label: 'Placed' },
  { value: 'received', label: 'Received' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' }
]
const restaurantOptions = computed(() => db.value.restaurants.map((r) => ({ value: r.id, label: r.name })))
const disputedOptions = [{ value: 'yes', label: 'Disputed only' }]

const hasFilters = computed(() => !!(filters.status || filters.restaurantId || filters.disputed))
function clearFilters() {
  filters.status = ''
  filters.restaurantId = ''
  filters.disputed = ''
}

const rows = computed(() =>
  [...db.value.orders]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .filter((o) => {
      if (filters.status && o.status !== filters.status) return false
      if (filters.restaurantId && o.restaurantId !== filters.restaurantId) return false
      if (filters.disputed === 'yes' && !o.disputeReported) return false
      return true
    })
)

function comboName(comboId: string) {
  return db.value.combos.find((c) => c.id === comboId)?.name ?? '—'
}
function restaurantName(id: string) {
  return db.value.restaurants.find((r) => r.id === id)?.name ?? '—'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Orders</h1>
      <p class="text-sm text-muted">{{ rows.length }} delivery order{{ rows.length === 1 ? '' : 's' }} matching your filters.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <BaseSelect v-model="filters.status" placeholder="All statuses" :options="statusOptions" />
        <BaseSelect v-model="filters.restaurantId" placeholder="All restaurants" :options="restaurantOptions" />
        <BaseSelect v-model="filters.disputed" placeholder="All orders" :options="disputedOptions" />
      </div>
      <button v-if="hasFilters" class="mt-3 text-xs font-semibold text-primary" @click="clearFilters">Clear filters</button>
    </BaseCard>

    <LoadingState v-if="pending" :rows="5" />
    <EmptyState v-else-if="!rows.length" icon="lucide:package" title="No matching orders" />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th class="px-5 py-3 font-semibold">Reference</th>
              <th class="px-5 py-3 font-semibold">Combo</th>
              <th class="px-5 py-3 font-semibold">Restaurant</th>
              <th class="px-5 py-3 font-semibold">Status</th>
              <th class="px-5 py-3 font-semibold">Placed</th>
              <th class="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="o in rows" :key="o.id" class="transition-colors hover:bg-black/[0.02]">
              <td class="px-5 py-3">
                <NuxtLink :to="`/admin/orders/${o.id}`" class="font-mono font-semibold text-ink hover:text-primary">{{ o.reference }}</NuxtLink>
              </td>
              <td class="px-5 py-3 text-ink">{{ comboName(o.comboId) }}</td>
              <td class="px-5 py-3 text-muted">{{ restaurantName(o.restaurantId) }}</td>
              <td class="px-5 py-3"><StatusBadge :status="o.status" /></td>
              <td class="px-5 py-3 text-muted">{{ new Date(o.createdAt).toLocaleString() }}</td>
              <td class="px-5 py-3 text-right">
                <span v-if="o.disputeReported" class="inline-flex items-center gap-1 text-xs font-semibold text-error">
                  <Icon name="lucide:flag" class="size-3.5" />
                  Disputed
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="divide-y divide-border md:hidden">
        <li v-for="o in rows" :key="o.id" class="p-4">
          <div class="flex items-center justify-between">
            <NuxtLink :to="`/admin/orders/${o.id}`" class="font-mono font-bold text-ink">{{ o.reference }}</NuxtLink>
            <StatusBadge :status="o.status" />
          </div>
          <p class="mt-1.5 text-sm text-ink">{{ comboName(o.comboId) }} · {{ restaurantName(o.restaurantId) }}</p>
          <div class="mt-1 flex items-center justify-between text-xs text-muted">
            <span>{{ new Date(o.createdAt).toLocaleDateString() }}</span>
            <span v-if="o.disputeReported" class="inline-flex items-center gap-1 font-semibold text-error">
              <Icon name="lucide:flag" class="size-3.5" />
              Disputed
            </span>
          </div>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
