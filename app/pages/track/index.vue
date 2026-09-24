<!-- app/pages/track/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'customer' })

import { ORDER_STATUS_FLOW, DROP_OPTION_LABEL, formatOrderAddress, type Order } from '~/composables/useMockDb'

const { db, getOrder, getVoucher, reportOrderProblem } = useMockDb()
const toast = useToast()

const reference = ref('')
const secretKey = ref('')
const error = ref('')
const looking = ref(false)
const order = ref<Order | null>(null)

const combo = computed(() => (order.value ? db.value.combos.find((c) => c.id === order.value!.comboId) : null))
const restaurant = computed(() => (order.value ? db.value.restaurants.find((r) => r.id === order.value!.restaurantId) : null))
const voucher = computed(() => (order.value ? getVoucher(order.value.voucherId) : null))

const stepLabels: Record<string, string> = { placed: 'Placed', received: 'Received', dispatched: 'Dispatched', delivered: 'Delivered' }
const currentStepIndex = computed(() => (order.value ? ORDER_STATUS_FLOW.indexOf(order.value.status) : -1))
const isTerminatedEarly = computed(() => order.value?.status === 'cancelled' || order.value?.status === 'rejected')

async function lookup() {
  if (!reference.value.trim() || !secretKey.value.trim()) return
  error.value = ''
  looking.value = true
  await new Promise((r) => setTimeout(r, 400))
  const found = getOrder(reference.value.trim())
  const v = found ? getVoucher(found.voucherId) : undefined
  looking.value = false

  if (!found || !v || v.secretKey.trim().toLowerCase() !== secretKey.value.trim().toLowerCase()) {
    error.value = 'Order reference and secret key do not match. Double-check and try again.'
    order.value = null
    return
  }
  order.value = found
}

const reportOpen = ref(false)
const reportNote = ref('')
const reporting = ref(false)

function submitReport() {
  if (!order.value) return
  reporting.value = true
  const res = reportOrderProblem(order.value.reference, secretKey.value, reportNote.value)
  reporting.value = false
  if (res.ok) {
    toast.success('Reported', "Thanks — we'll look into it.")
    reportOpen.value = false
    reportNote.value = ''
  } else {
    toast.error('Could not report', res.error)
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md space-y-6 px-4 py-8 sm:px-0">
    <div>
      <h1 class="text-xl font-bold text-ink">Track your order</h1>
      <p class="mt-1 text-sm text-muted">Enter your order reference and secret key.</p>
    </div>

    <BaseCard>
      <form class="space-y-4" @submit.prevent="lookup">
        <BaseInput v-model="reference" label="Order reference" placeholder="KV-9F3K2Q" icon="lucide:package-search" required />
        <BaseInput v-model="secretKey" label="Secret key (KokoSend username)" icon="lucide:key-round" required />
        <p v-if="error" role="alert" class="flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-2.5 text-xs font-medium text-error">
          <Icon name="lucide:circle-alert" class="mt-px size-4 shrink-0" />
          {{ error }}
        </p>
        <BaseButton type="submit" block :loading="looking">Track order</BaseButton>
      </form>
    </BaseCard>

    <BaseCard v-if="order" class="animate-fade-up">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-mono text-sm font-bold tracking-widest text-ink">{{ order.reference }}</p>
          <p class="mt-1 text-sm text-muted">{{ combo?.name }} · {{ restaurant?.name }}</p>
        </div>
        <StatusBadge :status="order.status" />
      </div>

      <template v-if="!isTerminatedEarly">
        <ol class="mt-6 space-y-4">
          <li v-for="(s, i) in ORDER_STATUS_FLOW" :key="s" class="flex items-center gap-3">
            <span
              class="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              :class="i <= currentStepIndex ? 'bg-success text-white' : 'bg-black/5 text-muted'"
            >
              <Icon v-if="i <= currentStepIndex" name="lucide:check" class="size-3.5" />
              <span v-else>{{ i + 1 }}</span>
            </span>
            <span class="text-sm font-semibold" :class="i <= currentStepIndex ? 'text-ink' : 'text-muted'">{{ stepLabels[s] }}</span>
          </li>
        </ol>
      </template>
      <div v-else class="mt-5 flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-3 text-sm font-medium text-error">
        <Icon name="lucide:circle-x" class="mt-0.5 size-4 shrink-0" />
        <span>
          This order was {{ order.status }}{{ voucher ? ' — your voucher is active again if it has not expired.' : '.' }}
        </span>
      </div>

      <div class="mt-6 space-y-1 border-t border-border pt-4 text-sm">
        <p class="flex justify-between"><span class="text-muted">Delivering to</span><span class="font-medium text-ink">{{ order.deliveryName }}</span></p>
        <p class="flex justify-between"><span class="text-muted">Address</span><span class="max-w-[60%] text-right font-medium text-ink">{{ formatOrderAddress(order) }}</span></p>
        <p class="flex justify-between"><span class="text-muted">Drop option</span><span class="font-medium text-ink">{{ DROP_OPTION_LABEL[order.dropOption] }}</span></p>
        <p v-if="order.spiceLevel" class="flex justify-between"><span class="text-muted">Spice</span><span class="font-medium text-ink">{{ order.spiceLevel === 'spicy' ? 'Spicy' : 'Non-spicy' }}</span></p>
        <p v-if="order.drinkChoice" class="flex justify-between"><span class="text-muted">Drink</span><span class="font-medium text-ink">{{ order.drinkChoice }}</span></p>
        <p class="flex justify-between"><span class="text-muted">Placed</span><span class="font-medium text-ink">{{ new Date(order.createdAt).toLocaleString() }}</span></p>
      </div>

      <div v-if="order.status === 'delivered'" class="mt-5 border-t border-border pt-5">
        <div v-if="order.disputeReported" class="flex items-start gap-2 rounded-control bg-warning-soft px-3.5 py-3 text-sm font-medium text-ink">
          <Icon name="lucide:flag" class="mt-0.5 size-4 shrink-0 text-warning" />
          You reported a problem with this order. Our team is reviewing it.
        </div>
        <template v-else-if="!reportOpen">
          <p class="text-sm text-muted">Didn't receive your order?</p>
          <button class="mt-1.5 text-sm font-semibold text-error" @click="reportOpen = true">Report a problem</button>
        </template>
        <form v-else class="space-y-3" @submit.prevent="submitReport">
          <label class="block text-sm font-medium text-ink">Tell us what happened</label>
          <textarea
            v-model="reportNote"
            rows="3"
            class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="I never received my order..."
          />
          <div class="flex gap-2">
            <BaseButton variant="secondary" size="sm" @click="reportOpen = false">Cancel</BaseButton>
            <BaseButton variant="danger" size="sm" :loading="reporting" @click="submitReport">Submit report</BaseButton>
          </div>
        </form>
      </div>
    </BaseCard>
  </div>
</template>
