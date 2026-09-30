<!-- app/pages/restaurant/wallet.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { restaurant } = useAuth()
const supabase = useSupabase()
const revision = useRestaurantOrdersRevision()

// RLS: every query returns this restaurant's rows only.
const { data, pending, error, refresh } = useAsyncData(
  'restaurant-wallet',
  async () => {
    const [wallet, ledger, payouts] = await Promise.all([
      supabase.from('restaurant_wallets').select('pending_balance, pending_count').maybeSingle(),
      supabase.from('payout_ledger').select().order('created_at', { ascending: false }).limit(200),
      supabase.from('payouts').select('id, total_amount, currency, item_count, reference, processed_at').order('processed_at', { ascending: false }).limit(100)
    ])
    for (const r of [wallet, ledger, payouts]) if (r.error) throw r.error
    return {
      balance: Number(wallet.data?.pending_balance ?? 0),
      pendingCount: Number(wallet.data?.pending_count ?? 0),
      ledger: ledger.data ?? [],
      payouts: payouts.data ?? []
    }
  },
  { watch: [revision] }
)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Wallet</h1>
      <p class="text-sm text-muted">Delivered orders and walk-ins add credits here. KokoSend pays out your pending balance in batches.</p>
    </div>

    <LoadingState v-if="pending && !data" :rows="3" />
    <ErrorState v-else-if="error" message="We couldn't load your wallet." @retry="refresh()" />
    <template v-else-if="data">
      <BaseCard class="animate-fade-up !bg-primary text-white">
        <p class="text-sm text-white/80">Pending balance</p>
        <p class="mt-1 text-3xl font-extrabold tabular-nums">{{ restaurant ? formatCurrency(data.balance, restaurant.currency) : '—' }}</p>
        <p class="mt-1 text-xs text-white/80">{{ data.pendingCount }} credit{{ data.pendingCount === 1 ? '' : 's' }} waiting for the next payout</p>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Credits</p></div>
        <EmptyState v-if="!data.ledger.length" icon="lucide:receipt" title="No credits yet" message="Each delivered order or walk-in adds a credit here." />
        <ul v-else class="divide-y divide-border">
          <li v-for="item in data.ledger" :key="item.id!" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0">
              <NuxtLink v-if="item.source_type === 'order'" :to="`/restaurant/orders/${item.source_id}`" class="block truncate text-sm font-semibold text-ink hover:text-primary">{{ payoutSourceLabel(item) }}</NuxtLink>
              <p v-else class="truncate text-sm font-semibold text-ink">{{ payoutSourceLabel(item) }}</p>
              <p class="text-xs text-muted">
                {{ new Date(item.created_at!).toLocaleString() }}
                <span v-if="item.status === 'revoked' && item.revoke_reason" class="text-error"> · Revoked: {{ item.revoke_reason }}</span>
                <span v-else-if="item.dispute_status === 'open' && item.status === 'pending'" class="text-error"> · Customer reported a problem</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <span class="font-semibold tabular-nums" :class="item.status === 'revoked' ? 'text-muted line-through' : 'text-ink'">{{ formatCurrency(Number(item.amount), item.currency!) }}</span>
              <StatusBadge :status="item.status!" />
            </div>
          </li>
        </ul>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Payout history</p></div>
        <EmptyState v-if="!data.payouts.length" icon="lucide:banknote" title="No payouts yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="p in data.payouts" :key="p.id" class="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
            <div>
              <p class="font-semibold text-ink">{{ new Date(p.processed_at).toLocaleString() }}</p>
              <p class="text-xs text-muted">{{ p.item_count }} credit{{ p.item_count === 1 ? '' : 's' }}{{ p.reference ? ` · ref ${p.reference}` : '' }}</p>
            </div>
            <span class="font-semibold tabular-nums text-ink">{{ formatCurrency(Number(p.total_amount), p.currency) }}</span>
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
