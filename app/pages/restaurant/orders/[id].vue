<!-- app/pages/restaurant/orders/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

import { ORDER_STATUS_FLOW, DROP_OPTION_LABEL, formatOrderAddress } from '~/composables/useMockDb'

const route = useRoute()
const { db, currentRestaurant, getOrder, getVoucher, updateOrderStatus } = useMockDb()
const toast = useToast()

const order = computed(() => getOrder(route.params.id as string))
const belongsToMe = computed(() => order.value && currentRestaurant.value && order.value.restaurantId === currentRestaurant.value.id)
const voucher = computed(() => (order.value ? getVoucher(order.value.voucherId) : undefined))
const combo = computed(() => (order.value ? db.value.combos.find((c) => c.id === order.value!.comboId) : undefined))

const stepLabels: Record<string, string> = { placed: 'Placed', received: 'Received', dispatched: 'Dispatched', delivered: 'Delivered' }
const currentStepIndex = computed(() => (order.value ? ORDER_STATUS_FLOW.indexOf(order.value.status) : -1))
const isTerminatedEarly = computed(() => order.value?.status === 'cancelled' || order.value?.status === 'rejected')
const nextStatus = computed(() => (order.value ? ORDER_STATUS_FLOW[currentStepIndex.value + 1] : undefined))
const canAdvance = computed(() => order.value && (order.value.status === 'placed' || order.value.status === 'received' || order.value.status === 'dispatched'))
const canReject = computed(() => order.value && (order.value.status === 'placed' || order.value.status === 'received'))

const advancing = ref(false)
async function advance() {
  if (!order.value || !nextStatus.value) return
  advancing.value = true
  await new Promise((r) => setTimeout(r, 400))
  const res = updateOrderStatus(order.value.id, nextStatus.value)
  advancing.value = false
  if (res.ok) {
    if (nextStatus.value === 'delivered') toast.success('Marked delivered', 'Your wallet has been credited.')
    else toast.success(`Order marked ${nextStatus.value}`)
  } else {
    toast.error('Could not update order', res.error)
  }
}

const rejectOpen = ref(false)
const rejectReason = ref('')
function confirmReject() {
  if (!order.value) return
  const res = updateOrderStatus(order.value.id, 'rejected', rejectReason.value)
  if (res.ok) toast.warning('Order rejected', "The customer's voucher has been released.")
  else toast.error('Could not reject', res.error)
  rejectOpen.value = false
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <NuxtLink to="/restaurant/orders" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to orders
    </NuxtLink>

    <EmptyState v-if="!order || !belongsToMe" icon="lucide:search-x" title="Order not found" />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-mono text-xl font-bold tracking-widest text-ink">{{ order.reference }}</p>
            <p class="mt-1 text-sm text-muted">{{ combo?.name }}</p>
          </div>
          <StatusBadge :status="order.status" />
        </div>

        <div v-if="order.disputeReported" class="mt-5 flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-3 text-sm font-medium text-error">
          <Icon name="lucide:flag" class="mt-0.5 size-4 shrink-0" />
          <span>Customer reported a problem with this order.</span>
        </div>

        <ol v-if="!isTerminatedEarly" class="mt-6 flex flex-wrap gap-4">
          <li v-for="(s, i) in ORDER_STATUS_FLOW" :key="s" class="flex items-center gap-2">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" :class="i <= currentStepIndex ? 'bg-success text-white' : 'bg-black/5 text-muted'">
              <Icon v-if="i <= currentStepIndex" name="lucide:check" class="size-3.5" />
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span class="text-sm font-semibold" :class="i <= currentStepIndex ? 'text-ink' : 'text-muted'">{{ stepLabels[s] }}</span>
          </li>
        </ol>
        <p v-else class="mt-5 text-sm font-medium text-error">This order was {{ order.status }}.</p>

        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5">
          <div><p class="text-xs text-muted">Deliver to</p><p class="mt-0.5 font-semibold text-ink">{{ order.deliveryName }}</p></div>
          <div><p class="text-xs text-muted">Phone</p><p class="mt-0.5 font-semibold text-ink">{{ order.deliveryPhone }}</p></div>
          <div><p class="text-xs text-muted">WhatsApp</p><p class="mt-0.5 font-semibold text-ink">{{ order.deliveryWhatsapp }}</p></div>
          <div><p class="text-xs text-muted">Drop option</p><p class="mt-0.5 font-semibold text-ink">{{ DROP_OPTION_LABEL[order.dropOption] }}</p></div>
          <div class="col-span-2"><p class="text-xs text-muted">Address</p><p class="mt-0.5 font-semibold text-ink">{{ formatOrderAddress(order) }}</p></div>
          <div v-if="order.spiceLevel"><p class="text-xs text-muted">Spice</p><p class="mt-0.5 font-semibold text-ink">{{ order.spiceLevel === 'spicy' ? 'Spicy' : 'Non-spicy' }}</p></div>
          <div v-if="order.drinkChoice"><p class="text-xs text-muted">Drink</p><p class="mt-0.5 font-semibold text-ink">{{ order.drinkChoice }}</p></div>
          <div v-if="order.additionalInfo" class="col-span-2"><p class="text-xs text-muted">Additional info</p><p class="mt-0.5 font-semibold text-ink">{{ order.additionalInfo }}</p></div>
        </div>

        <div v-if="voucher" class="mt-5 flex items-center justify-between border-t border-border pt-5 text-sm">
          <span class="text-muted">Voucher value</span>
          <span class="font-bold text-ink">{{ formatCurrency(voucher.amount, voucher.currency) }}</span>
        </div>

        <div v-if="canAdvance || canReject" class="mt-5 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
          <BaseButton v-if="canAdvance" block :loading="advancing" @click="advance">
            Mark as {{ nextStatus }}
            <Icon name="lucide:arrow-right" class="size-4" />
          </BaseButton>
          <BaseButton v-if="canReject" variant="danger" block @click="rejectOpen = true">Reject order</BaseButton>
        </div>
      </BaseCard>
    </template>

    <BaseModal v-model="rejectOpen" title="Reject this order?">
      <p class="text-sm text-muted">The customer's voucher is released so they can try again elsewhere.</p>
      <label class="mt-4 block">
        <span class="mb-1.5 block text-sm font-medium text-ink">Reason</span>
        <input v-model="rejectReason" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. out of stock" />
      </label>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="rejectOpen = false">Cancel</BaseButton>
        <BaseButton variant="danger" block @click="confirmReject">Reject order</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
