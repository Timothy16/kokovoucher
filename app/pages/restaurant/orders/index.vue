<!-- app/pages/restaurant/orders/index.vue -->
<script setup lang="ts">
import type { Order } from '#shared/types/models'

definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const supabase = useSupabase()
const revision = useRestaurantOrdersRevision()

const filters = reactive({ status: '' })
const statusOptions = [
  { value: 'open', label: 'Needs action' },
  { value: 'placed', label: 'Placed (new)' },
  { value: 'received', label: 'Received' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }
]

// RLS returns only this restaurant's orders. Refetches live when the layout sees a change.
const { data: rows, pending, error, refresh } = useAsyncData(
  'restaurant-orders',
  async () => {
    let q = supabase.from('orders').select('id, reference, status, delivery_name, created_at, amount, currency, combos(name)').order('created_at', { ascending: false }).limit(200)
    if (filters.status === 'open') q = q.in('status', ['placed', 'received', 'dispatched'])
    else if (filters.status) q = q.eq('status', filters.status as Order['status'])
    const { data, error } = await q
    if (error) throw error
    return data
  },
  { watch: [() => filters.status, revision] }
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Orders</h1>
      <p class="text-sm text-muted">New orders appear here automatically. Open one to accept it and update its progress.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <BaseSelect v-model="filters.status" placeholder="All orders" :options="statusOptions" class="sm:max-w-xs" />
    </BaseCard>

    <LoadingState v-if="pending && !rows" :rows="4" />
    <ErrorState v-else-if="error" message="We couldn't load your orders." @retry="refresh()" />
    <EmptyState v-else-if="!rows?.length" icon="lucide:package" :title="filters.status ? 'No orders match' : 'No orders yet'" message="New delivery orders will show up here." />

    <div v-else class="grid gap-3">
      <NuxtLink v-for="o in rows" :key="o.id" :to="`/restaurant/orders/${o.id}`" class="block animate-fade-up">
        <BaseCard hover :class="o.status === 'placed' ? 'border-warning/50' : ''">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-mono text-sm font-bold text-ink">{{ o.reference }}</p>
              <p class="truncate text-sm text-muted">{{ o.combos?.name ?? '—' }} · {{ o.delivery_name }}</p>
              <p class="text-xs text-muted">{{ new Date(o.created_at).toLocaleString() }}</p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge :status="o.status" />
              <span class="text-xs font-semibold text-ink">{{ formatCurrency(Number(o.amount), o.currency) }}</span>
            </div>
          </div>
        </BaseCard>
      </NuxtLink>
    </div>
  </div>
</template>
