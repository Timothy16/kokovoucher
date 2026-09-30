<!-- app/pages/restaurant/orders/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const route = useRoute()
const supabase = useSupabase()
const api = useApi()
const toast = useToast()
const revision = useRestaurantOrdersRevision()
const id = route.params.id as string

// RLS: a restaurant can only load its own orders, so another restaurant's id reads as "not found".
const { data: order, pending, error, refresh } = useAsyncData(
  `restaurant-order-${id}`,
  async () => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null
    const { data, error } = await supabase.from('orders').select('*, combos(name)').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },
  { watch: [revision] }
)

const stepIndex = computed(() => (order.value ? ORDER_STATUS_FLOW.indexOf(order.value.status) : -1))
const endedEarly = computed(() => order.value?.status === 'cancelled' || order.value?.status === 'rejected')
const next = computed(() => (order.value ? nextOrderStatus(order.value.status) : null))
const canReject = computed(() => order.value?.status === 'placed' || order.value?.status === 'received')

const actionLabel: Record<string, string> = { received: 'Accept order', dispatched: 'Mark as dispatched', delivered: 'Mark as delivered' }

const busy = ref(false)
async function move(status: 'received' | 'dispatched' | 'delivered' | 'rejected', note?: string) {
  if (busy.value) return
  busy.value = true
  try {
    await api(`/api/restaurant/orders/${id}`, { method: 'PATCH', body: { status, note } })
    const done: Record<string, [string, string]> = {
      received: ['Order accepted', 'The customer has been told you are preparing it.'],
      dispatched: ['Marked as dispatched', 'The customer has been told it is on the way.'],
      delivered: ['Marked as delivered', 'The voucher value has been added to your wallet.'],
      rejected: ['Order rejected', "The customer's voucher has been released."]
    }
    toast.success(...done[status]!)
    rejectOpen.value = false
    await refresh()
  } catch (e) {
    toast.error('Could not update the order', apiErrorMessage(e))
    await refresh()
  } finally {
    busy.value = false
  }
}

const confirmDeliveredOpen = ref(false)
const rejectOpen = ref(false)
const rejectReason = ref('')
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <NuxtLink to="/restaurant/orders" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to orders
    </NuxtLink>

    <LoadingState v-if="pending && !order" :rows="4" />
    <ErrorState v-else-if="error" message="We couldn't load this order." @retry="refresh()" />
    <EmptyState v-else-if="!order" icon="lucide:search-x" title="Order not found" />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-mono text-xl font-bold tracking-widest text-ink">{{ order.reference }}</p>
            <p class="mt-1 text-sm text-muted">{{ order.combos?.name }} · placed {{ new Date(order.created_at).toLocaleString() }}</p>
          </div>
          <StatusBadge :status="order.status" />
        </div>

        <div v-if="order.dispute_status === 'open'" class="mt-5 flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-3 text-sm font-medium text-error">
          <Icon name="lucide:flag" class="mt-0.5 size-4 shrink-0" />
          <span>The customer reported a problem with this order. KokoSend is reviewing it.</span>
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
        <p v-else class="mt-5 text-sm font-medium text-error">This order was {{ order.status }}. The customer's voucher was released.</p>

        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5">
          <div><p class="text-xs text-muted">Deliver to</p><p class="mt-0.5 font-semibold text-ink">{{ order.delivery_name }}</p></div>
          <div><p class="text-xs text-muted">Phone</p><a :href="`tel:${order.delivery_phone}`" class="mt-0.5 block font-semibold text-primary">{{ order.delivery_phone }}</a></div>
          <div><p class="text-xs text-muted">WhatsApp</p><p class="mt-0.5 font-semibold text-ink">{{ order.delivery_whatsapp }}</p></div>
          <div><p class="text-xs text-muted">Drop option</p><p class="mt-0.5 font-semibold text-ink">{{ DROP_OPTION_LABEL[order.drop_option] }}</p></div>
          <div class="col-span-2"><p class="text-xs text-muted">Address</p><p class="mt-0.5 font-semibold text-ink">{{ formatOrderAddress(order) }}</p></div>
          <div v-if="order.spice_level"><p class="text-xs text-muted">Spice</p><p class="mt-0.5 font-semibold text-ink">{{ SPICE_LABEL[order.spice_level] }}</p></div>
          <div v-if="order.drink_choice"><p class="text-xs text-muted">Drink</p><p class="mt-0.5 font-semibold text-ink">{{ order.drink_choice }}</p></div>
          <div v-if="order.additional_info" class="col-span-2"><p class="text-xs text-muted">Additional info</p><p class="mt-0.5 font-semibold text-ink">{{ order.additional_info }}</p></div>
        </div>

        <div class="mt-5 flex items-center justify-between border-t border-border pt-5 text-sm">
          <span class="text-muted">{{ order.status === 'delivered' ? 'Credited to your wallet' : 'You will be credited on delivery' }}</span>
          <span class="font-bold text-ink">{{ formatCurrency(Number(order.amount), order.currency) }}</span>
        </div>

        <div v-if="next || canReject" class="mt-5 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
          <BaseButton v-if="next" block size="lg" :loading="busy" @click="next === 'delivered' ? (confirmDeliveredOpen = true) : move(next as 'received' | 'dispatched')">
            {{ actionLabel[next] }}
            <Icon name="lucide:arrow-right" class="size-4" />
          </BaseButton>
          <BaseButton v-if="canReject" variant="danger" block size="lg" :disabled="busy" @click="rejectOpen = true">Reject order</BaseButton>
        </div>
      </BaseCard>
    </template>

    <BaseModal v-model="confirmDeliveredOpen" title="Confirm delivery?">
      <p class="text-sm text-muted">Only mark this delivered once the customer has their food. The voucher is used up and its value is added to your wallet. A false delivery can be disputed by the customer and revoked.</p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="confirmDeliveredOpen = false">Not yet</BaseButton>
        <BaseButton block :loading="busy" @click="confirmDeliveredOpen = false; move('delivered')">Yes, it's delivered</BaseButton>
      </div>
    </BaseModal>

    <BaseModal v-model="rejectOpen" title="Reject this order?">
      <p class="text-sm text-muted">The customer's voucher is released so they can order elsewhere. They'll see the reason you give.</p>
      <label class="mt-4 block">
        <span class="mb-1.5 block text-sm font-medium text-ink">Reason</span>
        <input v-model="rejectReason" maxlength="300" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. out of stock today" />
      </label>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="rejectOpen = false">Keep order</BaseButton>
        <BaseButton variant="danger" block :loading="busy" :disabled="rejectReason.trim().length < 3" @click="move('rejected', rejectReason)">Reject order</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
