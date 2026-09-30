<!-- app/pages/admin/index.vue -->
<script setup lang="ts">
import type { Currency } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()

const { data, pending, error, refresh } = useAsyncData('admin-dashboard', async () => {
  // "Today" is the admin's own local day.
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const since = start.toISOString()
  const count = { count: 'exact' as const, head: true }

  const [issued, redeemed, expired, reserved, invited, disputes, wallets, recent] = await Promise.all([
    supabase.from('vouchers').select('id', count).gte('created_at', since),
    supabase.from('vouchers').select('id', count).gte('redeemed_at', since),
    supabase.from('voucher_events').select('id', count).eq('type', 'expired').gte('at', since),
    supabase.from('vouchers').select('id', count).eq('status', 'reserved'),
    supabase.from('restaurants').select('id', count).eq('status', 'invited'),
    supabase.from('orders').select('id', count).eq('dispute_status', 'open'),
    supabase.from('restaurant_wallets').select('currency, pending_balance'),
    supabase.from('vouchers').select('id, code, customer_full_name, secret_key, amount, currency, status, expires_at, created_at').order('created_at', { ascending: false }).limit(6)
  ])
  for (const r of [issued, redeemed, expired, reserved, invited, disputes, wallets, recent]) if (r.error) throw r.error

  const pendingByCurrency = new Map<Currency, number>()
  for (const w of wallets.data ?? []) {
    const c = w.currency as Currency
    pendingByCurrency.set(c, Math.round(((pendingByCurrency.get(c) ?? 0) + Number(w.pending_balance)) * 100) / 100)
  }

  return {
    issuedToday: issued.count ?? 0,
    redeemedToday: redeemed.count ?? 0,
    expiredToday: expired.count ?? 0,
    reservedNow: reserved.count ?? 0,
    invited: invited.count ?? 0,
    openDisputes: disputes.count ?? 0,
    pendingByCurrency: [...pendingByCurrency].filter(([, v]) => v > 0),
    recent: recent.data ?? []
  }
})

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-ink">Dashboard</h1>
        <p class="text-sm text-muted">Today's voucher activity at a glance.</p>
      </div>
      <BaseButton @click="navigateTo('/admin/generate')">
        <Icon name="lucide:sparkles" class="size-4" />
        Generate voucher
      </BaseButton>
    </div>

    <LoadingState v-if="pending && !data" :rows="4" />
    <ErrorState v-else-if="error" message="We couldn't load the dashboard." @retry="refresh()" />
    <template v-else-if="data">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Issued today" :value="data.issuedToday" icon="lucide:send" tone="primary" />
        <StatCard label="Redeemed today" :value="data.redeemedToday" icon="lucide:check-check" tone="success" />
        <StatCard label="In delivery now" :value="data.reservedNow" icon="lucide:hourglass" tone="warning" />
        <StatCard label="Expired today" :value="data.expiredToday" icon="lucide:clock-alert" tone="error" />
      </div>

      <div v-if="data.invited || data.openDisputes || data.pendingByCurrency.length" class="grid gap-4 sm:grid-cols-2">
        <BaseCard v-if="data.openDisputes" class="animate-fade-up border-error/30 !bg-error-soft/40">
          <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-full bg-error-soft text-error"><Icon name="lucide:flag" class="size-5" /></div>
              <div>
                <p class="font-semibold text-ink">{{ data.openDisputes }} open order dispute{{ data.openDisputes === 1 ? '' : 's' }}</p>
                <p class="text-sm text-muted">Review before paying that restaurant.</p>
              </div>
            </div>
            <BaseButton size="sm" variant="secondary" @click="navigateTo('/admin/orders?dispute=open')">Review</BaseButton>
          </div>
        </BaseCard>

        <BaseCard v-if="data.invited" class="animate-fade-up border-warning/30 !bg-warning-soft/40">
          <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-full bg-warning-soft text-warning"><Icon name="lucide:store" class="size-5" /></div>
              <div>
                <p class="font-semibold text-ink">{{ data.invited }} restaurant{{ data.invited === 1 ? '' : 's' }} yet to accept their invite</p>
                <p class="text-sm text-muted">Resend or follow up so they can go live.</p>
              </div>
            </div>
            <BaseButton size="sm" variant="secondary" @click="navigateTo('/admin/restaurants')">Review</BaseButton>
          </div>
        </BaseCard>

        <BaseCard v-if="data.pendingByCurrency.length" class="animate-fade-up sm:col-span-2">
          <p class="font-bold text-ink">Pending payouts</p>
          <div class="mt-3 flex flex-wrap gap-3">
            <span v-for="[currency, amount] in data.pendingByCurrency" :key="currency" class="rounded-control bg-black/[0.03] px-3.5 py-2 text-sm font-semibold tabular-nums text-ink">
              {{ formatCurrency(amount, currency) }}
            </span>
          </div>
          <NuxtLink to="/admin/payouts" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Go to payouts
            <Icon name="lucide:arrow-right" class="size-3.5" />
          </NuxtLink>
        </BaseCard>
      </div>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="flex items-center justify-between border-b border-border px-5 py-4">
          <p class="font-bold text-ink">Recent vouchers</p>
          <NuxtLink to="/admin/vouchers" class="text-xs font-semibold text-primary">View all</NuxtLink>
        </div>
        <EmptyState v-if="!data.recent.length" icon="lucide:ticket" title="No vouchers yet" message="Issued vouchers will show up here." />
        <ul v-else class="divide-y divide-border">
          <li v-for="v in data.recent" :key="v.id">
            <NuxtLink :to="`/admin/vouchers/${v.id}`" class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[0.02]">
              <Avatar :seed="v.secret_key" :size="38" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-ink">{{ v.customer_full_name }}</p>
                <p class="truncate text-xs text-muted">{{ v.secret_key }} · {{ formatCurrency(Number(v.amount), v.currency) }}</p>
              </div>
              <StatusBadge :status="effectiveVoucherStatus(v)" />
              <span class="hidden w-16 shrink-0 text-right text-xs text-muted sm:block">{{ timeAgo(v.created_at) }}</span>
            </NuxtLink>
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
