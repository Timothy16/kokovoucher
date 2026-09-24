<!-- app/pages/admin/walk-ins/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const filters = reactive({ restaurantId: '' })
const restaurantOptions = computed(() => db.value.restaurants.map((r) => ({ value: r.id, label: r.name })))

const rows = computed(() =>
  [...db.value.walkIns]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .filter((w) => !filters.restaurantId || w.restaurantId === filters.restaurantId)
)

function restaurantName(id: string) {
  return db.value.restaurants.find((r) => r.id === id)?.name ?? '—'
}
function voucherCode(id: string) {
  return db.value.vouchers.find((v) => v.id === id)?.code ?? '—'
}
function currencyOf(id: string) {
  return db.value.vouchers.find((v) => v.id === id)?.currency ?? 'NGN'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Walk-in redemptions</h1>
      <p class="text-sm text-muted">{{ rows.length }} walk-in{{ rows.length === 1 ? '' : 's' }} recorded.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <BaseSelect v-model="filters.restaurantId" placeholder="All restaurants" :options="restaurantOptions" class="sm:max-w-xs" />
    </BaseCard>

    <LoadingState v-if="pending" :rows="4" />
    <EmptyState v-else-if="!rows.length" icon="lucide:footprints" title="No walk-ins yet" />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th class="px-5 py-3 font-semibold">Voucher</th>
              <th class="px-5 py-3 font-semibold">Restaurant</th>
              <th class="px-5 py-3 font-semibold">Bill</th>
              <th class="px-5 py-3 font-semibold">Credited</th>
              <th class="px-5 py-3 font-semibold">Forfeited</th>
              <th class="px-5 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="w in rows" :key="w.id" class="transition-colors hover:bg-black/[0.02]">
              <td class="px-5 py-3">
                <NuxtLink :to="`/admin/vouchers/${w.voucherId}`" class="font-mono font-semibold text-ink hover:text-primary">{{ voucherCode(w.voucherId) }}</NuxtLink>
              </td>
              <td class="px-5 py-3 text-muted">{{ restaurantName(w.restaurantId) }}</td>
              <td class="px-5 py-3 text-ink">{{ formatCurrency(w.billAmount, currencyOf(w.voucherId)) }}</td>
              <td class="px-5 py-3 font-semibold text-success">{{ formatCurrency(w.creditedAmount, currencyOf(w.voucherId)) }}</td>
              <td class="px-5 py-3 text-muted">{{ w.forfeitedAmount > 0 ? formatCurrency(w.forfeitedAmount, currencyOf(w.voucherId)) : '—' }}</td>
              <td class="px-5 py-3 text-muted">{{ new Date(w.createdAt).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="divide-y divide-border md:hidden">
        <li v-for="w in rows" :key="w.id" class="p-4">
          <div class="flex items-center justify-between">
            <NuxtLink :to="`/admin/vouchers/${w.voucherId}`" class="font-mono font-bold text-ink">{{ voucherCode(w.voucherId) }}</NuxtLink>
            <span class="text-xs text-muted">{{ new Date(w.createdAt).toLocaleDateString() }}</span>
          </div>
          <p class="mt-1 text-sm text-muted">{{ restaurantName(w.restaurantId) }}</p>
          <div class="mt-2 flex items-center justify-between text-sm">
            <span class="text-muted">Bill {{ formatCurrency(w.billAmount, currencyOf(w.voucherId)) }}</span>
            <span class="font-semibold text-success">+{{ formatCurrency(w.creditedAmount, currencyOf(w.voucherId)) }}</span>
          </div>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
