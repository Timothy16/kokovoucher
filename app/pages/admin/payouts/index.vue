<!-- app/pages/admin/payouts/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db, pendingPayoutItems, pendingBalance, processPayout, revokePayoutItem } = useMockDb()
const toast = useToast()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

function sourceLabel(item: ReturnType<typeof pendingPayoutItems>[number]) {
  if (item.sourceType === 'walk_in') {
    const w = db.value.walkIns.find((x) => x.id === item.sourceId)
    return w ? `Walk-in · ${new Date(w.createdAt).toLocaleDateString()}` : 'Walk-in'
  }
  const o = db.value.orders.find((x) => x.id === item.sourceId)
  return o ? `Order ${o.reference}` : 'Delivery order'
}
function sourceOrderId(item: ReturnType<typeof pendingPayoutItems>[number]) {
  return item.sourceType === 'order' ? item.sourceId : null
}
function isDisputed(item: ReturnType<typeof pendingPayoutItems>[number]) {
  if (item.sourceType !== 'order') return false
  return !!db.value.orders.find((x) => x.id === item.sourceId)?.disputeReported
}

const restaurantsWithBalance = computed(() =>
  db.value.restaurants
    .filter((r) => r.status !== 'invited')
    .map((r) => {
      const items = pendingPayoutItems(r.id)
      return { restaurant: r, items, balance: pendingBalance(r.id), hasDisputed: items.some(isDisputed) }
    })
    .sort((a, b) => b.balance - a.balance)
)

// process
const processTarget = ref<{ id: string; name: string; balance: number; currency: string; hasDisputed: boolean } | null>(null)
const processOpen = computed({ get: () => !!processTarget.value, set: (v: boolean) => { if (!v) processTarget.value = null } })
const reference = ref('')
const processing = ref(false)

function askProcess(row: (typeof restaurantsWithBalance.value)[number]) {
  processTarget.value = { id: row.restaurant.id, name: row.restaurant.name, balance: row.balance, currency: row.restaurant.currency, hasDisputed: row.hasDisputed }
  reference.value = ''
}
async function confirmProcess() {
  if (!processTarget.value) return
  processing.value = true
  await new Promise((r) => setTimeout(r, 450))
  const res = processPayout(processTarget.value.id, reference.value)
  processing.value = false
  if (res.ok) toast.success('Payout processed', `${formatCurrency(processTarget.value.balance, processTarget.value.currency as any)} paid to ${processTarget.value.name}.`)
  else toast.error('Could not process payout', res.error)
  processTarget.value = null
}

// revoke
const revokeTarget = ref<{ id: string; label: string; amount: number; currency: string } | null>(null)
const revokeOpen = computed({ get: () => !!revokeTarget.value, set: (v: boolean) => { if (!v) revokeTarget.value = null } })
const revokeReason = ref('')
function askRevoke(item: ReturnType<typeof pendingPayoutItems>[number]) {
  revokeTarget.value = { id: item.id, label: sourceLabel(item), amount: item.amount, currency: item.currency }
  revokeReason.value = ''
}
function confirmRevoke() {
  if (!revokeTarget.value) return
  const res = revokePayoutItem(revokeTarget.value.id, revokeReason.value)
  if (res.ok) toast.warning('Payment revoked', 'The restaurant has been notified.')
  else toast.error('Could not revoke', res.error)
  revokeTarget.value = null
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Payouts</h1>
      <p class="text-sm text-muted">Review pending balances, revoke a discrepancy before paying, then process.</p>
    </div>

    <LoadingState v-if="pending" :rows="3" />

    <div v-else class="space-y-4">
      <BaseCard v-for="row in restaurantsWithBalance" :key="row.restaurant.id" class="animate-fade-up">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <Avatar :seed="row.restaurant.name" :size="40" />
            <div>
              <p class="flex items-center gap-2 font-bold text-ink">
                {{ row.restaurant.name }}
                <span v-if="row.hasDisputed" class="inline-flex items-center gap-1 rounded-full bg-error-soft px-2 py-0.5 text-xs font-semibold text-error">
                  <Icon name="lucide:flag" class="size-3" />
                  Disputed item pending
                </span>
              </p>
              <p class="text-xs text-muted">{{ row.items.length }} pending item{{ row.items.length === 1 ? '' : 's' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-lg font-extrabold text-ink">{{ formatCurrency(row.balance, row.restaurant.currency) }}</span>
            <BaseButton size="sm" :disabled="row.balance <= 0" @click="askProcess(row)">Process payout</BaseButton>
          </div>
        </div>

        <ul v-if="row.items.length" class="mt-4 divide-y divide-border border-t border-border">
          <li v-for="item in row.items" :key="item.id" class="flex items-center justify-between gap-3 py-3 text-sm" :class="isDisputed(item) ? 'bg-error-soft/40' : ''">
            <span class="flex items-center gap-2">
              <NuxtLink v-if="sourceOrderId(item)" :to="`/admin/orders/${sourceOrderId(item)}`" class="text-muted hover:text-primary">{{ sourceLabel(item) }}</NuxtLink>
              <span v-else class="text-muted">{{ sourceLabel(item) }}</span>
              <span v-if="isDisputed(item)" class="inline-flex items-center gap-1 rounded-full bg-error-soft px-2 py-0.5 text-xs font-semibold text-error">
                <Icon name="lucide:flag" class="size-3" />
                Disputed
              </span>
            </span>
            <div class="flex items-center gap-3">
              <span class="font-semibold text-ink">{{ formatCurrency(item.amount, item.currency) }}</span>
              <button class="text-xs font-semibold text-error" @click="askRevoke(item)">Revoke</button>
            </div>
          </li>
        </ul>
      </BaseCard>
    </div>

    <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
      <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Payout history</p></div>
      <EmptyState v-if="!db.payouts.length" icon="lucide:banknote" title="No payouts processed yet" />
      <ul v-else class="divide-y divide-border">
        <li v-for="p in [...db.payouts].sort((a, b) => +new Date(b.processedAt) - +new Date(a.processedAt))" :key="p.id" class="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
          <div class="min-w-0">
            <p class="font-semibold text-ink">{{ db.restaurants.find((r) => r.id === p.restaurantId)?.name }}</p>
            <p class="text-xs text-muted">{{ new Date(p.processedAt).toLocaleString() }} · {{ p.itemCount }} item{{ p.itemCount === 1 ? '' : 's' }}{{ p.reference ? ` · ${p.reference}` : '' }}</p>
          </div>
          <span class="shrink-0 font-semibold text-ink">{{ formatCurrency(p.totalAmount, p.currency) }}</span>
        </li>
      </ul>
    </BaseCard>

    <BaseModal v-model="processOpen" title="Process payout?">
      <p class="text-sm text-muted">
        Pay <span class="font-semibold text-ink">{{ formatCurrency(processTarget?.balance ?? 0, (processTarget?.currency as any) ?? 'NGN') }}</span>
        to <span class="font-semibold text-ink">{{ processTarget?.name }}</span>? Their pending balance goes to zero.
      </p>
      <p v-if="processTarget?.hasDisputed" class="mt-3 flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-2.5 text-xs font-medium text-error">
        <Icon name="lucide:triangle-alert" class="mt-px size-4 shrink-0" />
        This includes at least one disputed order. Revoke it first if you haven't resolved the dispute — paid items can't be revoked afterward.
      </p>
      <label class="mt-4 block">
        <span class="mb-1.5 block text-sm font-medium text-ink">Reference (optional)</span>
        <input v-model="reference" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. bank transfer ref" />
      </label>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="processOpen = false">Cancel</BaseButton>
        <BaseButton block :loading="processing" @click="confirmProcess">Confirm &amp; pay</BaseButton>
      </div>
    </BaseModal>

    <BaseModal v-model="revokeOpen" title="Revoke this payment?">
      <p class="text-sm text-muted">
        Removes <span class="font-semibold text-ink">{{ formatCurrency(revokeTarget?.amount ?? 0, (revokeTarget?.currency as any) ?? 'NGN') }}</span>
        ({{ revokeTarget?.label }}) from the pending balance. Use this when a restaurant claimed a delivery that never happened.
      </p>
      <label class="mt-4 block">
        <span class="mb-1.5 block text-sm font-medium text-ink">Reason (required)</span>
        <input v-model="revokeReason" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. customer confirmed non-delivery" />
      </label>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="revokeOpen = false">Cancel</BaseButton>
        <BaseButton variant="danger" block :disabled="!revokeReason.trim()" @click="confirmRevoke">Revoke payment</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
