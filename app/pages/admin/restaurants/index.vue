<!-- app/pages/admin/restaurants/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()

const statusRank: Record<string, number> = { invited: 0, active: 1, disabled: 2 }

const { data, pending, error, refresh } = useAsyncData('admin-restaurants', async () => {
  const [restaurants, wallets] = await Promise.all([
    // payout_items = one per delivered order / completed walk-in, i.e. the redemption count.
    supabase.from('restaurants').select('*, combos(count), payout_items(count)').order('created_at', { ascending: false }),
    supabase.from('restaurant_wallets').select('restaurant_id, pending_balance')
  ])
  if (restaurants.error) throw restaurants.error
  if (wallets.error) throw wallets.error
  const balance = new Map(wallets.data.map((w) => [w.restaurant_id, Number(w.pending_balance ?? 0)]))
  return restaurants.data
    .map((r) => ({
      ...r,
      comboCount: r.combos[0]?.count ?? 0,
      redemptionCount: r.payout_items[0]?.count ?? 0,
      pendingBalance: balance.get(r.id) ?? 0
    }))
    .sort((a, b) => statusRank[a.status]! - statusRank[b.status]!)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-ink">Restaurants</h1>
        <p class="text-sm text-muted">Invite partners and manage their menus, orders, and payouts.</p>
      </div>
      <BaseButton @click="navigateTo('/admin/restaurants/create')">
        <Icon name="lucide:plus" class="size-4" />
        Add restaurant
      </BaseButton>
    </div>

    <LoadingState v-if="pending && !data" :rows="4" />
    <ErrorState v-else-if="error" message="We couldn't load restaurants." @retry="refresh()" />
    <EmptyState v-else-if="!data?.length" icon="lucide:store" title="No restaurants yet">
      <BaseButton size="sm" @click="navigateTo('/admin/restaurants/create')">Add your first restaurant</BaseButton>
    </EmptyState>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard v-for="r in data" :key="r.id" hover class="animate-fade-up" :padded="false">
        <NuxtLink :to="`/admin/restaurants/${r.id}`" class="block p-5 sm:p-6">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <Avatar :seed="r.name" :src="storagePublicUrl('restaurant-logos', r.logo_path)" :size="42" />
              <div class="min-w-0">
                <p class="truncate font-bold text-ink hover:text-primary">{{ r.name }}</p>
                <p class="truncate text-xs text-muted">{{ r.contact_email }}</p>
              </div>
            </div>
            <StatusBadge :status="r.status" />
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
            <span class="text-muted">{{ r.redemptionCount }} redemption{{ r.redemptionCount === 1 ? '' : 's' }}</span>
            <span class="font-semibold text-ink">{{ r.currency }}</span>
          </div>
          <div v-if="r.status !== 'invited'" class="mt-2 flex items-center justify-between text-sm">
            <span class="text-muted">Pending payout</span>
            <span class="font-semibold text-ink">{{ formatCurrency(r.pendingBalance, r.currency) }}</span>
          </div>
        </NuxtLink>
        <NuxtLink
          :to="`/admin/restaurants/${r.id}/menu`"
          class="flex items-center justify-between gap-2 border-t border-border px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft sm:px-6"
        >
          <span class="inline-flex items-center gap-1.5">
            <Icon name="lucide:utensils-crossed" class="size-4" />
            Manage menu
          </span>
          <span class="text-xs font-medium text-muted">{{ r.comboCount }} combo{{ r.comboCount === 1 ? '' : 's' }}</span>
        </NuxtLink>
      </BaseCard>
    </div>
  </div>
</template>
