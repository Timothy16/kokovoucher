<!-- app/pages/admin/orders/index.vue -->
<script setup lang="ts">
import type { Order } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()
const PAGE_SIZE = 200

const route = useRoute()
// ?dispute=open comes from the dashboard's "open disputes" card.
const filters = reactive({ status: '', restaurantId: '', dispute: route.query.dispute === 'open' || route.query.dispute === 'resolved' ? route.query.dispute : '' })
const statusOptions = [
  { value: 'placed', label: 'Placed' },
  { value: 'received', label: 'Received' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' }
]
const disputeOptions = [
  { value: 'open', label: 'Open disputes' },
  { value: 'resolved', label: 'Resolved disputes' }
]

const { data: restaurants } = useAsyncData('admin-orders-restaurants', async () => {
  const { data } = await supabase.from('restaurants').select('id, name').order('name')
  return (data ?? []).map((r) => ({ value: r.id, label: r.name }))
})

const { data: rows, pending, error, refresh } = useAsyncData(
  'admin-orders',
  async () => {
    let q = supabase.from('orders').select('id, reference, status, amount, currency, created_at, dispute_status, combos(name), restaurants(name)').order('created_at', { ascending: false }).limit(PAGE_SIZE)
    if (filters.status) q = q.eq('status', filters.status as Order['status'])
    if (filters.restaurantId) q = q.eq('restaurant_id', filters.restaurantId)
    if (filters.dispute) q = q.eq('dispute_status', filters.dispute as 'open' | 'resolved')
    const { data, error } = await q
    if (error) throw error
    return data
  },
  { watch: [() => ({ ...filters })] }
)

const hasFilters = computed(() => !!(filters.status || filters.restaurantId || filters.dispute))
function clearFilters() {
  Object.assign(filters, { status: '', restaurantId: '', dispute: '' })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Orders</h1>
      <p class="text-sm text-muted">
        <template v-if="rows">{{ rows.length }}{{ rows.length === PAGE_SIZE ? '+' : '' }} delivery order{{ rows.length === 1 ? '' : 's' }}{{ hasFilters ? ' matching your filters' : '' }}.</template>
      </p>
    </div>

    <BaseCard class="animate-fade-up">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BaseSelect v-model="filters.status" placeholder="All statuses" :options="statusOptions" />
        <BaseSelect v-model="filters.restaurantId" placeholder="All restaurants" :options="restaurants ?? []" />
        <BaseSelect v-model="filters.dispute" placeholder="Any dispute state" :options="disputeOptions" />
      </div>
      <button v-if="hasFilters" class="mt-3 text-xs font-semibold text-primary" @click="clearFilters">Clear filters</button>
    </BaseCard>

    <LoadingState v-if="pending && !rows" :rows="5" />
    <ErrorState v-else-if="error" message="We couldn't load orders." @retry="refresh()" />
    <EmptyState v-else-if="!rows?.length" icon="lucide:package" :title="hasFilters ? 'No matching orders' : 'No orders yet'" :message="hasFilters ? 'Try adjusting or clearing your filters.' : 'Delivery orders from the public menu will show up here.'" />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th class="px-5 py-3 font-semibold">Reference</th>
              <th class="px-5 py-3 font-semibold">Combo</th>
              <th class="px-5 py-3 font-semibold">Restaurant</th>
              <th class="px-5 py-3 font-semibold">Value</th>
              <th class="px-5 py-3 font-semibold">Status</th>
              <th class="px-5 py-3 font-semibold">Placed</th>
              <th class="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="o in rows" :key="o.id" class="transition-colors hover:bg-black/[0.02]">
              <td class="px-5 py-3"><NuxtLink :to="`/admin/orders/${o.id}`" class="font-mono font-semibold text-ink hover:text-primary">{{ o.reference }}</NuxtLink></td>
              <td class="px-5 py-3 text-ink">{{ o.combos?.name ?? '—' }}</td>
              <td class="px-5 py-3 text-muted">{{ o.restaurants?.name ?? '—' }}</td>
              <td class="px-5 py-3 font-semibold text-ink">{{ formatCurrency(Number(o.amount), o.currency) }}</td>
              <td class="px-5 py-3"><StatusBadge :status="o.status" /></td>
              <td class="whitespace-nowrap px-5 py-3 text-muted">{{ new Date(o.created_at).toLocaleString() }}</td>
              <td class="px-5 py-3 text-right">
                <span v-if="o.dispute_status" class="inline-flex items-center gap-1 text-xs font-semibold" :class="o.dispute_status === 'open' ? 'text-error' : 'text-muted'">
                  <Icon name="lucide:flag" class="size-3.5" />
                  {{ o.dispute_status === 'open' ? 'Disputed' : 'Resolved' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="divide-y divide-border md:hidden">
        <li v-for="o in rows" :key="o.id" class="p-4">
          <div class="flex items-center justify-between gap-2">
            <NuxtLink :to="`/admin/orders/${o.id}`" class="font-mono font-bold text-ink">{{ o.reference }}</NuxtLink>
            <StatusBadge :status="o.status" />
          </div>
          <p class="mt-1.5 text-sm text-ink">{{ o.combos?.name ?? '—' }} · {{ o.restaurants?.name ?? '—' }}</p>
          <div class="mt-1 flex items-center justify-between text-xs text-muted">
            <span>{{ formatCurrency(Number(o.amount), o.currency) }} · {{ new Date(o.created_at).toLocaleDateString() }}</span>
            <span v-if="o.dispute_status === 'open'" class="inline-flex items-center gap-1 font-semibold text-error">
              <Icon name="lucide:flag" class="size-3.5" />
              Disputed
            </span>
          </div>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
