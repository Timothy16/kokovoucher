<!-- app/pages/admin/restaurants/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db, pendingBalance } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const statusRank: Record<string, number> = { invited: 0, active: 1, disabled: 2 }
const rows = computed(() => [...db.value.restaurants].sort((a, b) => statusRank[a.status] - statusRank[b.status]))

function redemptionCount(id: string) {
  const delivered = db.value.orders.filter((o) => o.restaurantId === id && o.status === 'delivered').length
  const walkIns = db.value.walkIns.filter((w) => w.restaurantId === id).length
  return delivered + walkIns
}
function comboCount(id: string) {
  return db.value.combos.filter((c) => c.restaurantId === id).length
}
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

    <LoadingState v-if="pending" :rows="4" />
    <EmptyState v-else-if="!rows.length" icon="lucide:store" title="No restaurants yet">
      <BaseButton size="sm" @click="navigateTo('/admin/restaurants/create')">Add your first restaurant</BaseButton>
    </EmptyState>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard v-for="r in rows" :key="r.id" hover class="animate-fade-up" :padded="false">
        <NuxtLink :to="`/admin/restaurants/${r.id}`" class="block p-5 sm:p-6">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <Avatar :seed="r.name" :size="42" />
              <div class="min-w-0">
                <p class="truncate font-bold text-ink hover:text-primary">{{ r.name }}</p>
                <p class="truncate text-xs text-muted">{{ r.contactEmail }}</p>
              </div>
            </div>
            <StatusBadge :status="r.status" />
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
            <span class="text-muted">{{ redemptionCount(r.id) }} redemptions</span>
            <span class="font-semibold text-ink">{{ r.currency }}</span>
          </div>
          <div v-if="r.status === 'active'" class="mt-2 flex items-center justify-between text-sm">
            <span class="text-muted">Pending payout</span>
            <span class="font-semibold text-ink">{{ formatCurrency(pendingBalance(r.id), r.currency) }}</span>
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
          <span class="text-xs font-medium text-muted">{{ comboCount(r.id) }} combo{{ comboCount(r.id) === 1 ? '' : 's' }}</span>
        </NuxtLink>
      </BaseCard>
    </div>
  </div>
</template>
