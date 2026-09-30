<!-- app/pages/admin/walk-ins/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()
const PAGE_SIZE = 200

const filters = reactive({ restaurantId: '' })

const { data: restaurants } = useAsyncData('admin-walkins-restaurants', async () => {
  const { data } = await supabase.from('restaurants').select('id, name').order('name')
  return (data ?? []).map((r) => ({ value: r.id, label: r.name }))
})

const { data: rows, pending, error, refresh } = useAsyncData(
  'admin-walk-ins',
  async () => {
    let q = supabase
      .from('walk_ins')
      .select('id, currency, bill_amount, credited_amount, forfeited_amount, created_at, vouchers(id, code), restaurants(name)')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (filters.restaurantId) q = q.eq('restaurant_id', filters.restaurantId)
    const { data, error } = await q
    if (error) throw error
    return data
  },
  { watch: [() => filters.restaurantId] }
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Walk-in redemptions</h1>
      <p class="text-sm text-muted">
        <template v-if="rows">{{ rows.length }}{{ rows.length === PAGE_SIZE ? '+' : '' }} walk-in{{ rows.length === 1 ? '' : 's' }}. Credited = the smaller of the bill and the voucher; any remainder is forfeited.</template>
      </p>
    </div>

    <BaseCard class="animate-fade-up">
      <BaseSelect v-model="filters.restaurantId" placeholder="All restaurants" :options="restaurants ?? []" class="sm:max-w-xs" />
    </BaseCard>

    <LoadingState v-if="pending && !rows" :rows="4" />
    <ErrorState v-else-if="error" message="We couldn't load walk-ins." @retry="refresh()" />
    <EmptyState v-else-if="!rows?.length" icon="lucide:footprints" title="No walk-ins yet" message="In-person redemptions at partner restaurants will show up here." />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm tabular-nums">
          <thead class="border-b border-border bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th class="px-5 py-3 font-semibold">Voucher</th>
              <th class="px-5 py-3 font-semibold">Restaurant</th>
              <th class="px-5 py-3 text-right font-semibold">Bill</th>
              <th class="px-5 py-3 text-right font-semibold">Credited</th>
              <th class="px-5 py-3 text-right font-semibold">Forfeited</th>
              <th class="px-5 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="w in rows" :key="w.id" class="transition-colors hover:bg-black/[0.02]">
              <td class="px-5 py-3">
                <NuxtLink v-if="w.vouchers" :to="`/admin/vouchers/${w.vouchers.id}`" class="font-mono font-semibold text-ink hover:text-primary">{{ w.vouchers.code }}</NuxtLink>
              </td>
              <td class="px-5 py-3 text-muted">{{ w.restaurants?.name ?? '—' }}</td>
              <td class="px-5 py-3 text-right text-ink">{{ formatCurrency(Number(w.bill_amount), w.currency) }}</td>
              <td class="px-5 py-3 text-right font-semibold text-success">{{ formatCurrency(Number(w.credited_amount), w.currency) }}</td>
              <td class="px-5 py-3 text-right text-muted">{{ Number(w.forfeited_amount) > 0 ? formatCurrency(Number(w.forfeited_amount), w.currency) : '—' }}</td>
              <td class="whitespace-nowrap px-5 py-3 text-muted">{{ new Date(w.created_at).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="divide-y divide-border md:hidden">
        <li v-for="w in rows" :key="w.id" class="p-4">
          <div class="flex items-center justify-between">
            <NuxtLink v-if="w.vouchers" :to="`/admin/vouchers/${w.vouchers.id}`" class="font-mono font-bold text-ink">{{ w.vouchers.code }}</NuxtLink>
            <span class="text-xs text-muted">{{ new Date(w.created_at).toLocaleDateString() }}</span>
          </div>
          <p class="mt-1 text-sm text-muted">{{ w.restaurants?.name ?? '—' }}</p>
          <div class="mt-2 flex items-center justify-between text-sm tabular-nums">
            <span class="text-muted">Bill {{ formatCurrency(Number(w.bill_amount), w.currency) }}</span>
            <span class="font-semibold text-success">+{{ formatCurrency(Number(w.credited_amount), w.currency) }}</span>
          </div>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
