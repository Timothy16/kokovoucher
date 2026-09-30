<!-- app/pages/admin/payouts/index.vue -->
<script setup lang="ts">
import type { Currency } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()
const api = useApi()
const toast = useToast()

const { data, pending, error, refresh } = useAsyncData('admin-payouts', async () => {
  const [wallets, lines, restaurants, history] = await Promise.all([
    // Totals come from the database's own sum, so the "expected total" we send back is exact.
    supabase.from('restaurant_wallets').select('restaurant_id, currency, pending_balance, pending_count'),
    supabase.from('payout_ledger').select().eq('status', 'pending').order('created_at'),
    supabase.from('restaurants').select('id, name, status, logo_path'),
    supabase.from('payouts').select('id, restaurant_id, total_amount, currency, item_count, reference, processed_at').order('processed_at', { ascending: false }).limit(100)
  ])
  for (const r of [wallets, lines, restaurants, history]) if (r.error) throw r.error
  const byId = new Map((restaurants.data ?? []).map((r) => [r.id, r]))
  const groups = (wallets.data ?? [])
    .map((w) => {
      const items = (lines.data ?? []).filter((l) => l.restaurant_id === w.restaurant_id)
      return {
        restaurant: byId.get(w.restaurant_id!)!,
        currency: w.currency as Currency,
        total: Number(w.pending_balance),
        count: Number(w.pending_count),
        items,
        disputed: items.filter((i) => i.dispute_status === 'open').length
      }
    })
    .filter((g) => g.restaurant)
    .sort((a, b) => b.disputed - a.disputed || b.total - a.total)
  return { groups, history: (history.data ?? []).map((p) => ({ ...p, restaurantName: byId.get(p.restaurant_id)?.name ?? '—' })) }
})

// ---------- process ----------
type Group = NonNullable<typeof data.value>['groups'][number]
const target = ref<Group | null>(null)
const processOpen = computed({ get: () => !!target.value, set: (v: boolean) => { if (!v) target.value = null } })
const reference = ref('')
const acknowledge = ref(false)
const processing = ref(false)

function askProcess(g: Group) {
  target.value = g
  reference.value = ''
  acknowledge.value = false
}

async function confirmProcess() {
  const g = target.value
  if (!g || processing.value || (g.disputed && !acknowledge.value)) return
  processing.value = true
  try {
    await api(`/api/admin/restaurants/${g.restaurant.id}/payout`, {
      method: 'POST',
      body: { expectedTotal: g.total, expectedCount: g.count, reference: reference.value, acknowledgeDisputes: acknowledge.value }
    })
    toast.success('Payout processed', `${formatCurrency(g.total, g.currency)} paid to ${g.restaurant.name}. They've been emailed.`)
    target.value = null
  } catch (e) {
    const reason = (e as { data?: { data?: { reason?: string } } })?.data?.data?.reason
    toast.error('Payout not processed', apiErrorMessage(e))
    if (reason === 'STALE' || reason === 'NOTHING_PENDING') target.value = null
  } finally {
    processing.value = false
    await refresh()
  }
}

// ---------- revoke ----------
const revokeTarget = ref<{ id: string; label: string; amount: number; currency: Currency; restaurant: string } | null>(null)
const revokeOpen = computed({ get: () => !!revokeTarget.value, set: (v: boolean) => { if (!v) revokeTarget.value = null } })
const revokeReason = ref('')
const revoking = ref(false)

function askRevoke(item: Group['items'][number], g: Group) {
  revokeTarget.value = { id: item.id!, label: payoutSourceLabel(item), amount: Number(item.amount), currency: g.currency, restaurant: g.restaurant.name }
  revokeReason.value = item.dispute_status === 'open' ? 'Customer reported the order was not delivered.' : ''
}

async function confirmRevoke() {
  if (!revokeTarget.value || revoking.value) return
  revoking.value = true
  try {
    await api(`/api/admin/payout-items/${revokeTarget.value.id}/revoke`, { method: 'POST', body: { reason: revokeReason.value } })
    toast.warning('Credit revoked', `${revokeTarget.value.restaurant} has been emailed the reason.`)
    revokeTarget.value = null
  } catch (e) {
    toast.error('Could not revoke', apiErrorMessage(e))
  } finally {
    revoking.value = false
    await refresh()
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Payouts</h1>
      <p class="text-sm text-muted">Review each restaurant's pending credits, revoke anything disputed, then process the payout.</p>
    </div>

    <LoadingState v-if="pending && !data" :rows="3" />
    <ErrorState v-else-if="error" message="We couldn't load payouts." @retry="refresh()" />

    <template v-else-if="data">
      <EmptyState v-if="!data.groups.length" icon="lucide:wallet" title="Nothing to pay out" message="Delivered orders and walk-ins add pending credits here." />

      <BaseCard v-for="g in data.groups" :key="g.restaurant.id" class="animate-fade-up">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <Avatar :seed="g.restaurant.name" :src="storagePublicUrl('restaurant-logos', g.restaurant.logo_path)" :size="40" />
            <div class="min-w-0">
              <p class="flex flex-wrap items-center gap-2 font-bold text-ink">
                <NuxtLink :to="`/admin/restaurants/${g.restaurant.id}`" class="hover:text-primary">{{ g.restaurant.name }}</NuxtLink>
                <StatusBadge v-if="g.restaurant.status !== 'active'" :status="g.restaurant.status" />
                <span v-if="g.disputed" class="inline-flex items-center gap-1 rounded-full bg-error-soft px-2 py-0.5 text-xs font-semibold text-error">
                  <Icon name="lucide:flag" class="size-3" />
                  {{ g.disputed }} disputed
                </span>
              </p>
              <p class="text-xs text-muted">{{ g.count }} pending item{{ g.count === 1 ? '' : 's' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-lg font-extrabold tabular-nums text-ink">{{ formatCurrency(g.total, g.currency) }}</span>
            <BaseButton size="sm" @click="askProcess(g)">Process payout</BaseButton>
          </div>
        </div>

        <ul class="mt-4 divide-y divide-border border-t border-border">
          <li v-for="item in g.items" :key="item.id!" class="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" :class="item.dispute_status === 'open' ? '-mx-2 rounded-control bg-error-soft/50 px-2' : ''">
            <span class="flex min-w-0 flex-wrap items-center gap-2">
              <NuxtLink v-if="item.source_type === 'order'" :to="`/admin/orders/${item.source_id}`" class="text-ink hover:text-primary">{{ payoutSourceLabel(item) }}</NuxtLink>
              <span v-else class="text-ink">{{ payoutSourceLabel(item) }}</span>
              <span class="text-xs text-muted">{{ new Date(item.created_at!).toLocaleDateString() }}</span>
              <span v-if="item.dispute_status === 'open'" class="inline-flex items-center gap-1 text-xs font-semibold text-error"><Icon name="lucide:flag" class="size-3" />Disputed</span>
              <span v-else-if="item.dispute_status === 'resolved'" class="text-xs text-muted">Dispute resolved</span>
            </span>
            <span class="flex items-center gap-3">
              <span class="font-semibold tabular-nums text-ink">{{ formatCurrency(Number(item.amount), g.currency) }}</span>
              <button class="py-1 text-xs font-semibold text-error" @click="askRevoke(item, g)">Revoke</button>
            </span>
          </li>
        </ul>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Payout history</p></div>
        <EmptyState v-if="!data.history.length" icon="lucide:banknote" title="No payouts processed yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="p in data.history" :key="p.id" class="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
            <div class="min-w-0">
              <p class="font-semibold text-ink">{{ p.restaurantName }}</p>
              <p class="text-xs text-muted">{{ new Date(p.processed_at).toLocaleString() }} · {{ p.item_count }} item{{ p.item_count === 1 ? '' : 's' }}{{ p.reference ? ` · ${p.reference}` : '' }}</p>
            </div>
            <span class="shrink-0 font-semibold tabular-nums text-ink">{{ formatCurrency(Number(p.total_amount), p.currency) }}</span>
          </li>
        </ul>
      </BaseCard>
    </template>

    <BaseModal v-model="processOpen" title="Process payout?">
      <template v-if="target">
        <p class="text-sm text-muted">
          Pay <span class="font-semibold text-ink">{{ formatCurrency(target.total, target.currency) }}</span> for {{ target.count }} item{{ target.count === 1 ? '' : 's' }} to
          <span class="font-semibold text-ink">{{ target.restaurant.name }}</span>. Their pending balance goes to zero, and paid items can't be revoked afterwards.
        </p>
        <div v-if="target.disputed" class="mt-3 space-y-2 rounded-control bg-error-soft px-3.5 py-3 text-xs font-medium text-error">
          <p class="flex items-start gap-2">
            <Icon name="lucide:triangle-alert" class="mt-px size-4 shrink-0" />
            {{ target.disputed }} of these items {{ target.disputed === 1 ? 'is' : 'are' }} from an order the customer says wasn't delivered. Revoke {{ target.disputed === 1 ? 'it' : 'them' }} first unless the dispute is settled.
          </p>
          <label class="flex items-center gap-2 pl-6 text-ink">
            <input id="ack-disputes" v-model="acknowledge" type="checkbox" class="rounded border-border text-primary focus:ring-primary/30" />
            Pay anyway, including the disputed item{{ target.disputed === 1 ? '' : 's' }}
          </label>
        </div>
        <label class="mt-4 block">
          <span class="mb-1.5 block text-sm font-medium text-ink">Payment reference (optional)</span>
          <input id="payout-reference" v-model="reference" maxlength="120" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. bank transfer reference" />
        </label>
        <div class="mt-5 flex gap-3">
          <BaseButton variant="secondary" block :disabled="processing" @click="processOpen = false">Cancel</BaseButton>
          <BaseButton block :loading="processing" :disabled="!!target.disputed && !acknowledge" @click="confirmProcess">Confirm &amp; pay</BaseButton>
        </div>
      </template>
    </BaseModal>

    <BaseModal v-model="revokeOpen" title="Revoke this credit?">
      <template v-if="revokeTarget">
        <p class="text-sm text-muted">
          Removes <span class="font-semibold text-ink">{{ formatCurrency(revokeTarget.amount, revokeTarget.currency) }}</span> ({{ revokeTarget.label }}) from
          {{ revokeTarget.restaurant }}'s pending balance. Use this when a restaurant claimed a delivery that didn't happen. The restaurant is emailed the reason.
        </p>
        <label class="mt-4 block">
          <span class="mb-1.5 block text-sm font-medium text-ink">Reason (shared with the restaurant)</span>
          <input id="revoke-reason" v-model="revokeReason" maxlength="500" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. customer confirmed non-delivery" />
        </label>
        <div class="mt-5 flex gap-3">
          <BaseButton variant="secondary" block :disabled="revoking" @click="revokeOpen = false">Cancel</BaseButton>
          <BaseButton variant="danger" block :loading="revoking" :disabled="revokeReason.trim().length < 3" @click="confirmRevoke">Revoke credit</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
