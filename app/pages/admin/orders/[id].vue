<!-- app/pages/admin/orders/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

import { ORDER_STATUS_FLOW, DROP_OPTION_LABEL, formatOrderAddress } from '~/composables/useMockDb'

const route = useRoute()
const { db, getOrder, getVoucher } = useMockDb()

const order = computed(() => getOrder(route.params.id as string))
const voucher = computed(() => (order.value ? getVoucher(order.value.voucherId) : undefined))
const combo = computed(() => (order.value ? db.value.combos.find((c) => c.id === order.value!.comboId) : undefined))
const restaurant = computed(() => (order.value ? db.value.restaurants.find((r) => r.id === order.value!.restaurantId) : undefined))

const stepLabels: Record<string, string> = { placed: 'Placed', received: 'Received', dispatched: 'Dispatched', delivered: 'Delivered' }
const currentStepIndex = computed(() => (order.value ? ORDER_STATUS_FLOW.indexOf(order.value.status) : -1))
const isTerminatedEarly = computed(() => order.value?.status === 'cancelled' || order.value?.status === 'rejected')
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <NuxtLink to="/admin/orders" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to orders
    </NuxtLink>

    <EmptyState v-if="!order" icon="lucide:search-x" title="Order not found" />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-mono text-xl font-bold tracking-widest text-ink">{{ order.reference }}</p>
            <p class="mt-1 text-sm text-muted">{{ combo?.name }} · {{ restaurant?.name }}</p>
          </div>
          <StatusBadge :status="order.status" />
        </div>

        <div v-if="order.disputeReported" class="mt-5 flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-3 text-sm font-medium text-error">
          <Icon name="lucide:flag" class="mt-0.5 size-4 shrink-0" />
          <span>Customer reported a problem: {{ order.disputeNote }}</span>
        </div>

        <template v-if="!isTerminatedEarly">
          <ol class="mt-6 flex flex-wrap gap-4">
            <li v-for="(s, i) in ORDER_STATUS_FLOW" :key="s" class="flex items-center gap-2">
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="i <= currentStepIndex ? 'bg-success text-white' : 'bg-black/5 text-muted'"
              >
                <Icon v-if="i <= currentStepIndex" name="lucide:check" class="size-3.5" />
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span class="text-sm font-semibold" :class="i <= currentStepIndex ? 'text-ink' : 'text-muted'">{{ stepLabels[s] }}</span>
            </li>
          </ol>
        </template>

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
          <span class="text-muted">Voucher</span>
          <NuxtLink :to="`/admin/vouchers/${voucher.id}`" class="font-mono font-semibold text-primary">{{ voucher.code }} — {{ formatCurrency(voucher.amount, voucher.currency) }}</NuxtLink>
        </div>
      </BaseCard>

      <BaseCard class="animate-fade-up">
        <p class="mb-5 font-bold text-ink">Status history</p>
        <ol class="relative space-y-6 border-l border-border pl-6">
          <li v-for="(h, i) in order.statusHistory" :key="i" class="relative">
            <span class="absolute -left-[31px] flex size-6 items-center justify-center rounded-full bg-primary-soft text-primary ring-4 ring-surface">
              <Icon name="lucide:dot" class="size-3.5" />
            </span>
            <p class="text-sm font-semibold capitalize text-ink">{{ h.status }}</p>
            <p class="text-xs text-muted">{{ new Date(h.at).toLocaleString() }}<span v-if="h.note"> · {{ h.note }}</span></p>
          </li>
        </ol>
      </BaseCard>
    </template>
  </div>
</template>
