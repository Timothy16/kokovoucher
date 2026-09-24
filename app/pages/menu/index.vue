<!-- app/pages/menu/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { publicMenu } = useMockDb()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 350))

const filters = reactive({ restaurantId: '', category: '', currency: '' })

const restaurantOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const row of publicMenu.value) seen.set(row.restaurant.id, row.restaurant.name)
  return Array.from(seen, ([value, label]) => ({ value, label }))
})
const categoryOptions = computed(() => {
  const seen = new Set(publicMenu.value.map((row) => row.combo.category))
  return Array.from(seen, (c) => ({ value: c, label: c }))
})
const currencyOptions = [
  { value: 'NGN', label: 'NGN — ₦' },
  { value: 'KES', label: 'KES — KSh' },
  { value: 'USD', label: 'USD — $' }
]

const hasFilters = computed(() => !!(filters.restaurantId || filters.category || filters.currency))
function clearFilters() {
  filters.restaurantId = ''
  filters.category = ''
  filters.currency = ''
}

const rows = computed(() =>
  publicMenu.value.filter((row) => {
    if (filters.restaurantId && row.restaurant.id !== filters.restaurantId) return false
    if (filters.category && row.combo.category !== filters.category) return false
    if (filters.currency && row.restaurant.currency !== filters.currency) return false
    return true
  })
)

const route = useRoute()
onMounted(() => {
  const c = route.query.currency
  if (typeof c === 'string') filters.currency = c
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <div class="animate-fade-up rounded-card border border-border bg-primary-soft/50 p-5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Choose a combo</h1>
          <p class="mt-1.5 max-w-xl text-sm text-muted">
            Pick a combo from any partner restaurant, then pay with your voucher code and secret key at checkout.
            Prefer to eat in? You can also walk into any partner restaurant and redeem your voucher in person.
          </p>
        </div>
        <NuxtLink to="/track" class="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-soft hover:border-primary/40 hover:bg-primary-soft">
          <Icon name="lucide:package-search" class="size-4" />
          Track an order
        </NuxtLink>
      </div>
    </div>

    <BaseCard class="mt-6 animate-fade-up">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BaseSelect v-model="filters.restaurantId" placeholder="All restaurants" :options="restaurantOptions" />
        <BaseSelect v-model="filters.category" placeholder="All categories" :options="categoryOptions" />
        <BaseSelect v-model="filters.currency" placeholder="All currencies" :options="currencyOptions" />
      </div>
      <button v-if="hasFilters" class="mt-3 text-xs font-semibold text-primary" @click="clearFilters">Clear filters</button>
    </BaseCard>

    <LoadingState v-if="pending" class="mt-6" :rows="4" />
    <EmptyState v-else-if="!rows.length" class="mt-6" icon="lucide:search-x" title="No combos match" message="Try clearing your filters." />

    <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <ComboCard v-for="row in rows" :key="row.combo.id" :combo="row.combo" :restaurant="row.restaurant" />
    </div>
  </div>
</template>
