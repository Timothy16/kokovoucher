<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db } = useMockDb()
const toast = useToast()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const filters = reactive({ status: '', restaurantId: '', currency: '', date: '' })

const statusOptions = [
  { value: 'issued', label: 'Issued' },
  { value: 'active', label: 'Active' },
  { value: 'redeemed', label: 'Redeemed' },
  { value: 'expired', label: 'Expired' }
]
const currencyOptions = [
  { value: 'NGN', label: 'NGN' },
  { value: 'KES', label: 'KES' },
  { value: 'USD', label: 'USD' }
]
const restaurantOptions = computed(() => db.value.restaurants.map((r) => ({ value: r.id, label: r.name })))

const hasFilters = computed(() => !!(filters.status || filters.restaurantId || filters.currency || filters.date))
function clearFilters() {
  filters.status = ''
  filters.restaurantId = ''
  filters.currency = ''
  filters.date = ''
}

const rows = computed(() => {
  return [...db.value.vouchers]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .filter((v) => {
      const status = computeEffectiveStatus(v)
      if (filters.status && status !== filters.status) return false
      if (filters.restaurantId && v.restaurantId !== filters.restaurantId) return false
      if (filters.currency && v.currency !== filters.currency) return false
      if (filters.date && v.createdAt.slice(0, 10) !== filters.date) return false
      return true
    })
})

function canResend(v: (typeof rows.value)[number]) {
  const status = computeEffectiveStatus(v)
  return status === 'issued' || status === 'active'
}
function resend(v: (typeof rows.value)[number]) {
  toast.success('Claim link resent', `Sent to ${v.customerEmail}`)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Vouchers</h1>
      <p class="text-sm text-muted">{{ rows.length }} voucher{{ rows.length === 1 ? '' : 's' }} matching your filters.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BaseSelect v-model="filters.status" placeholder="All statuses" :options="statusOptions" />
        <BaseSelect v-model="filters.restaurantId" placeholder="All restaurants" :options="restaurantOptions" />
        <BaseSelect v-model="filters.currency" placeholder="All currencies" :options="currencyOptions" />
        <input v-model="filters.date" type="date" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </div>
      <button v-if="hasFilters" class="mt-3 text-xs font-semibold text-primary" @click="clearFilters">Clear filters</button>
    </BaseCard>

    <LoadingState v-if="pending" :rows="5" />
    <EmptyState v-else-if="!rows.length" icon="lucide:search-x" title="No matching vouchers" message="Try adjusting or clearing your filters." />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <!-- desktop table -->
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th class="px-5 py-3 font-semibold">Code</th>
              <th class="px-5 py-3 font-semibold">Customer</th>
              <th class="px-5 py-3 font-semibold">Restaurant</th>
              <th class="px-5 py-3 font-semibold">Value</th>
              <th class="px-5 py-3 font-semibold">Status</th>
              <th class="px-5 py-3 font-semibold">Created</th>
              <th class="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="v in rows" :key="v.id" class="transition-colors hover:bg-black/[0.02]">
              <td class="px-5 py-3">
                <NuxtLink :to="`/admin/vouchers/${v.id}`" class="font-mono font-semibold text-ink hover:text-primary">{{ v.code }}</NuxtLink>
              </td>
              <td class="px-5 py-3 text-ink">{{ v.customerEmail }}</td>
              <td class="px-5 py-3 text-muted">{{ v.restaurantName }}</td>
              <td class="px-5 py-3 font-semibold text-ink">{{ formatCurrency(v.amount, v.currency) }}</td>
              <td class="px-5 py-3"><StatusBadge :status="computeEffectiveStatus(v)" /></td>
              <td class="px-5 py-3 text-muted">{{ new Date(v.createdAt).toLocaleString() }}</td>
              <td class="px-5 py-3 text-right">
                <button
                  class="text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:text-muted"
                  :disabled="!canResend(v)"
                  @click="resend(v)"
                >
                  Resend
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- mobile cards -->
      <ul class="divide-y divide-border md:hidden">
        <li v-for="v in rows" :key="v.id" class="p-4">
          <div class="flex items-center justify-between">
            <NuxtLink :to="`/admin/vouchers/${v.id}`" class="font-mono font-bold text-ink">{{ v.code }}</NuxtLink>
            <StatusBadge :status="computeEffectiveStatus(v)" />
          </div>
          <p class="mt-1.5 text-sm text-ink">{{ v.customerEmail }}</p>
          <p class="text-xs text-muted">{{ v.restaurantName }} · {{ new Date(v.createdAt).toLocaleDateString() }}</p>
          <div class="mt-2 flex items-center justify-between">
            <span class="font-semibold text-ink">{{ formatCurrency(v.amount, v.currency) }}</span>
            <button class="text-xs font-semibold text-primary disabled:text-muted" :disabled="!canResend(v)" @click="resend(v)">Resend</button>
          </div>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
