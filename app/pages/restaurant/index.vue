<!-- app/pages/restaurant/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { restaurant } = useAuth()
const supabase = useSupabase()
const revision = useRestaurantOrdersRevision()

// RLS scopes every query here to the signed-in restaurant.
const { data, pending, error, refresh } = useAsyncData(
  'restaurant-dashboard',
  async () => {
    const [open, recent, wallet] = await Promise.all([
      supabase.from('orders').select('status').in('status', ['placed', 'received', 'dispatched']),
      supabase.from('orders').select('id, reference, status, created_at, combos(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('restaurant_wallets').select('pending_balance').maybeSingle()
    ])
    for (const r of [open, recent, wallet]) if (r.error) throw r.error
    return {
      newCount: (open.data ?? []).filter((o) => o.status === 'placed').length,
      openCount: open.data?.length ?? 0,
      recent: recent.data ?? [],
      balance: Number(wallet.data?.pending_balance ?? 0)
    }
  },
  { watch: [revision] }
)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Welcome back{{ restaurant ? `, ${restaurant.name}` : '' }}</h1>
      <p class="text-sm text-muted">Here's what's happening today.</p>
    </div>

    <LoadingState v-if="pending && !data" :rows="3" />
    <ErrorState v-else-if="error" message="We couldn't load your dashboard." @retry="refresh()" />
    <template v-else-if="data">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="New orders" :value="data.newCount" icon="lucide:bell" tone="warning" />
        <StatCard label="Open orders" :value="data.openCount" icon="lucide:package" tone="primary" />
        <StatCard label="Pending payout" :value="restaurant ? formatCurrency(data.balance, restaurant.currency) : '—'" icon="lucide:wallet" tone="success" />
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <NuxtLink to="/restaurant/orders" class="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
          <Icon name="lucide:package" class="size-5 text-primary" />
          <span class="font-semibold text-ink">Manage orders</span>
        </NuxtLink>
        <NuxtLink to="/restaurant/walk-in" class="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
          <Icon name="lucide:ticket-check" class="size-5 text-primary" />
          <span class="font-semibold text-ink">Redeem a walk-in</span>
        </NuxtLink>
        <NuxtLink to="/restaurant/menu" class="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
          <Icon name="lucide:utensils-crossed" class="size-5 text-primary" />
          <span class="font-semibold text-ink">Update menu</span>
        </NuxtLink>
      </div>

      <BaseCard :padded="false" class="overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Recent orders</p></div>
        <EmptyState v-if="!data.recent.length" icon="lucide:package" title="No orders yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="o in data.recent" :key="o.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <NuxtLink :to="`/restaurant/orders/${o.id}`" class="min-w-0">
              <p class="font-mono text-sm font-semibold text-ink hover:text-primary">{{ o.reference }}</p>
              <p class="truncate text-xs text-muted">{{ o.combos?.name ?? '—' }}</p>
            </NuxtLink>
            <StatusBadge :status="o.status" />
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
