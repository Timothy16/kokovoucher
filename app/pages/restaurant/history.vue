<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { db, currentRestaurant } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const redeemed = computed(() =>
  db.value.vouchers
    .filter((v) => v.restaurantId === currentRestaurant.value?.id && v.status === 'redeemed')
    .sort((a, b) => +new Date(b.redeemedAt!) - +new Date(a.redeemedAt!))
)

const totalsByCurrency = computed(() => {
  const totals: Partial<Record<'NGN' | 'KES' | 'USD', number>> = {}
  for (const v of redeemed.value) totals[v.currency] = (totals[v.currency] ?? 0) + v.amount
  return totals
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Redemption history</h1>
      <p class="text-sm text-muted">{{ redeemed.length }} vouchers redeemed at {{ currentRestaurant?.name }}.</p>
    </div>

    <LoadingState v-if="pending" :rows="4" />
    <EmptyState v-else-if="!redeemed.length" icon="lucide:receipt" title="No redemptions yet" message="Redeemed vouchers will show up here." />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <ul class="divide-y divide-border">
        <li v-for="v in redeemed" :key="v.id" class="flex items-center gap-4 px-5 py-4">
          <Avatar :seed="v.customerEmail" :size="38" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-ink">{{ v.customerEmail }}</p>
            <p class="font-mono text-xs text-muted">{{ v.code }}</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-ink">{{ formatCurrency(v.amount, v.currency) }}</p>
            <p class="text-xs text-muted">{{ new Date(v.redeemedAt!).toLocaleString() }}</p>
          </div>
        </li>
      </ul>
      <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 border-t border-border bg-black/[0.02] px-5 py-3 text-sm font-semibold text-ink">
        <span class="text-xs font-normal text-muted">Total redeemed:</span>
        <span v-for="(amount, currency) in totalsByCurrency" :key="currency">{{ formatCurrency(amount, currency) }}</span>
      </div>
    </BaseCard>
  </div>
</template>
