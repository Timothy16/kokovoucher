<!-- app/pages/admin/orders/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const supabase = useSupabase()
const api = useApi()
const toast = useToast()
const id = route.params.id as string

const { data, pending, error, refresh } = useAsyncData(`admin-order-${id}`, async () => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const [order, history, payout] = await Promise.all([
    supabase.from('orders').select('*, combos(name), restaurants(id, name), vouchers(id, code)').eq('id', id).maybeSingle(),
    supabase.from('order_status_history').select().eq('order_id', id).order('at').order('id'),
    supabase.from('payout_items').select('status').eq('source_type', 'order').eq('source_id', id).maybeSingle()
  ])
  for (const r of [order, history, payout]) if (r.error) throw r.error
  if (!order.data) return null
  return { order: order.data, history: history.data ?? [], payoutStatus: payout.data?.status ?? null }
})
const order = computed(() => data.value?.order ?? null)
const stepIndex = computed(() => (order.value ? ORDER_STATUS_FLOW.indexOf(order.value.status) : -1))
const endedEarly = computed(() => order.value?.status === 'cancelled' || order.value?.status === 'rejected')

const resolveOpen = ref(false)
const resolveNote = ref('')
const resolving = ref(false)
async function resolve() {
  if (resolving.value) return
  resolving.value = true
  try {
    await api(`/api/admin/orders/${id}/resolve`, { method: 'POST', body: { note: resolveNote.value } })
    toast.success('Dispute resolved')
    resolveOpen.value = false
    resolveNote.value = ''
    await refresh()
  } catch (e) {
    toast.error('Could not resolve', apiErrorMessage(e))
  } finally {
    resolving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <NuxtLink to="/admin/orders" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to orders
    </NuxtLink>

    <LoadingState v-if="pending && !data" :rows="4" />
    <ErrorState v-else-if="error" message="We couldn't load this order." @retry="refresh()" />
    <EmptyState v-else-if="!order || !data" icon="lucide:search-x" title="Order not found" />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-mono text-xl font-bold tracking-widest text-ink">{{ order.reference }}</p>
            <p class="mt-1 text-sm text-muted">
              {{ order.combos?.name }} ·
              <NuxtLink v-if="order.restaurants" :to="`/admin/restaurants/${order.restaurants.id}`" class="font-semibold text-primary">{{ order.restaurants.name }}</NuxtLink>
            </p>
          </div>
          <StatusBadge :status="order.status" />
        </div>

        <div v-if="order.dispute_status" class="mt-5 rounded-control px-3.5 py-3 text-sm" :class="order.dispute_status === 'open' ? 'bg-error-soft' : 'bg-black/[0.03]'">
          <p class="flex items-start gap-2 font-medium" :class="order.dispute_status === 'open' ? 'text-error' : 'text-ink'">
            <Icon name="lucide:flag" class="mt-0.5 size-4 shrink-0" />
            <span>Customer reported a problem {{ order.dispute_reported_at ? `on ${new Date(order.dispute_reported_at).toLocaleString()}` : '' }}: {{ order.dispute_note || 'no details given.' }}</span>
          </p>
          <p v-if="order.dispute_status === 'resolved'" class="mt-2 pl-6 text-ink">
            <span class="font-semibold">Resolved</span> {{ order.dispute_resolved_at ? new Date(order.dispute_resolved_at).toLocaleString() : '' }}: {{ order.dispute_resolution_note }}
          </p>
          <div v-else class="mt-3 flex flex-wrap items-center gap-3 pl-6">
            <BaseButton size="sm" @click="resolveOpen = true">Mark resolved</BaseButton>
            <NuxtLink v-if="data.payoutStatus === 'pending'" to="/admin/payouts" class="text-xs font-semibold text-error">Revoke the restaurant's credit on Payouts</NuxtLink>
            <span v-else-if="data.payoutStatus" class="text-xs text-muted">Restaurant credit is {{ data.payoutStatus }}.</span>
          </div>
        </div>

        <ol v-if="!endedEarly" class="mt-6 flex flex-wrap gap-4">
          <li v-for="(s, i) in ORDER_STATUS_FLOW" :key="s" class="flex items-center gap-2">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" :class="i <= stepIndex ? 'bg-success text-white' : 'bg-black/5 text-muted'">
              <Icon v-if="i <= stepIndex" name="lucide:check" class="size-3.5" />
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span class="text-sm font-semibold" :class="i <= stepIndex ? 'text-ink' : 'text-muted'">{{ ORDER_STEP_LABEL[s] }}</span>
          </li>
        </ol>

        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5">
          <div><p class="text-xs text-muted">Deliver to</p><p class="mt-0.5 font-semibold text-ink">{{ order.delivery_name }}</p></div>
          <div><p class="text-xs text-muted">Phone</p><p class="mt-0.5 font-semibold text-ink">{{ order.delivery_phone }}</p></div>
          <div><p class="text-xs text-muted">WhatsApp</p><p class="mt-0.5 font-semibold text-ink">{{ order.delivery_whatsapp }}</p></div>
          <div><p class="text-xs text-muted">Drop option</p><p class="mt-0.5 font-semibold text-ink">{{ DROP_OPTION_LABEL[order.drop_option] }}</p></div>
          <div class="col-span-2"><p class="text-xs text-muted">Address</p><p class="mt-0.5 font-semibold text-ink">{{ formatOrderAddress(order) }}</p></div>
          <div v-if="order.spice_level"><p class="text-xs text-muted">Spice</p><p class="mt-0.5 font-semibold text-ink">{{ SPICE_LABEL[order.spice_level] }}</p></div>
          <div v-if="order.drink_choice"><p class="text-xs text-muted">Drink</p><p class="mt-0.5 font-semibold text-ink">{{ order.drink_choice }}</p></div>
          <div v-if="order.additional_info" class="col-span-2"><p class="text-xs text-muted">Additional info</p><p class="mt-0.5 font-semibold text-ink">{{ order.additional_info }}</p></div>
        </div>

        <div class="mt-5 flex items-center justify-between border-t border-border pt-5 text-sm">
          <span class="text-muted">Voucher</span>
          <NuxtLink v-if="order.vouchers" :to="`/admin/vouchers/${order.vouchers.id}`" class="font-mono font-semibold text-primary">
            {{ order.vouchers.code }} · {{ formatCurrency(Number(order.amount), order.currency) }}
          </NuxtLink>
        </div>
      </BaseCard>

      <BaseCard class="animate-fade-up">
        <p class="mb-5 font-bold text-ink">Status history</p>
        <ol class="relative space-y-6 border-l border-border pl-6">
          <li v-for="h in data.history" :key="h.id" class="relative">
            <span class="absolute -left-[31px] flex size-6 items-center justify-center rounded-full bg-primary-soft text-primary ring-4 ring-surface">
              <Icon name="lucide:dot" class="size-3.5" />
            </span>
            <p class="text-sm font-semibold text-ink">{{ ORDER_STEP_LABEL[h.status] }}</p>
            <p class="text-xs text-muted">{{ new Date(h.at).toLocaleString() }}<span v-if="h.note"> · {{ h.note }}</span></p>
          </li>
        </ol>
      </BaseCard>
    </template>

    <BaseModal v-model="resolveOpen" title="Resolve this dispute?">
      <p class="text-sm text-muted">Record what was decided. This closes the dispute; it doesn't move any money. Revoke the credit on Payouts first if the restaurant shouldn't be paid.</p>
      <label class="mt-4 block">
        <span class="mb-1.5 block text-sm font-medium text-ink">Resolution note</span>
        <textarea v-model="resolveNote" rows="3" maxlength="1000" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. restaurant sent proof of delivery; customer confirmed" />
      </label>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="resolveOpen = false">Cancel</BaseButton>
        <BaseButton block :loading="resolving" :disabled="resolveNote.trim().length < 3" @click="resolve">Mark resolved</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
