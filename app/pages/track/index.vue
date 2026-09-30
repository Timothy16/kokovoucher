<!-- app/pages/track/index.vue -->
<script setup lang="ts">
import type { Currency } from '#shared/types/models'

definePageMeta({ layout: 'customer' })

interface Tracked {
  reference: string
  status: OrderStatus
  amount: number
  currency: Currency
  comboName: string | null
  restaurantName: string | null
  deliveryName: string
  address: string
  dropOption: DropOption
  spiceLevel: SpiceLevel | null
  drinkChoice: string | null
  disputeStatus: 'open' | 'resolved' | null
  createdAt: string
  voucherUsableAgain: boolean
  history: { status: OrderStatus; at: string; note: string | null }[]
}

const route = useRoute()
const api = useApi()
const toast = useToast()

// Emails link here with ?ref=… so the customer only has to type their secret key.
const reference = ref(typeof route.query.ref === 'string' ? route.query.ref : '')
const secretKey = ref('')
const error = ref('')
const looking = ref(false)
const order = ref<Tracked | null>(null)

async function lookup() {
  if (!reference.value.trim() || !secretKey.value.trim() || looking.value) return
  error.value = ''
  looking.value = true
  try {
    order.value = await api<Tracked>('/api/orders/track', { method: 'POST', body: { reference: reference.value, secretKey: secretKey.value } })
  } catch (e) {
    order.value = null
    error.value = apiErrorMessage(e, "We couldn't look up that order. Please try again.")
  } finally {
    looking.value = false
  }
}

const stepIndex = computed(() => (order.value ? ORDER_STATUS_FLOW.indexOf(order.value.status) : -1))
const endedEarly = computed(() => order.value?.status === 'cancelled' || order.value?.status === 'rejected')
const endNote = computed(() => order.value?.history.findLast((h) => h.status === order.value?.status)?.note ?? null)
const stepTime = (s: OrderStatus) => order.value?.history.find((h) => h.status === s)?.at

const reportOpen = ref(false)
const reportNote = ref('')
const reporting = ref(false)
async function submitReport() {
  if (!order.value || reporting.value) return
  reporting.value = true
  try {
    await api('/api/orders/report', { method: 'POST', body: { reference: order.value.reference, secretKey: secretKey.value, note: reportNote.value } })
    toast.success('Report sent', "Our team will look into it and get back to you.")
    reportOpen.value = false
    reportNote.value = ''
    await lookup()
  } catch (e) {
    toast.error('Could not send your report', apiErrorMessage(e))
  } finally {
    reporting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md space-y-6 px-4 py-8 sm:px-0">
    <div>
      <h1 class="text-xl font-bold text-ink">Track your order</h1>
      <p class="mt-1 text-sm text-muted">Enter your order reference and your secret key (your KokoSend username).</p>
    </div>

    <BaseCard>
      <form class="space-y-4" @submit.prevent="lookup">
        <BaseInput v-model="reference" label="Order reference" placeholder="KV-9F3K2Q" icon="lucide:package-search" autocomplete="off" required />
        <BaseInput v-model="secretKey" label="Secret key (KokoSend username)" icon="lucide:key-round" autocomplete="off" required />
        <p v-if="error" role="alert" class="flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-2.5 text-xs font-medium text-error">
          <Icon name="lucide:circle-alert" class="mt-px size-4 shrink-0" />
          {{ error }}
        </p>
        <BaseButton type="submit" block :loading="looking">{{ order ? 'Refresh' : 'Track order' }}</BaseButton>
      </form>
    </BaseCard>

    <BaseCard v-if="order" class="animate-fade-up">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-mono text-sm font-bold tracking-widest text-ink">{{ order.reference }}</p>
          <p class="mt-1 text-sm text-muted">{{ order.comboName }} · {{ order.restaurantName }}</p>
        </div>
        <StatusBadge :status="order.status" />
      </div>

      <ol v-if="!endedEarly" class="mt-6 space-y-4">
        <li v-for="(s, i) in ORDER_STATUS_FLOW" :key="s" class="flex items-center gap-3">
          <span class="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" :class="i <= stepIndex ? 'bg-success text-white' : 'bg-black/5 text-muted'">
            <Icon v-if="i <= stepIndex" name="lucide:check" class="size-3.5" />
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span class="flex-1 text-sm font-semibold" :class="i <= stepIndex ? 'text-ink' : 'text-muted'">{{ ORDER_STEP_LABEL[s] }}</span>
          <span v-if="stepTime(s)" class="text-xs text-muted">{{ new Date(stepTime(s)!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
        </li>
      </ol>
      <div v-else class="mt-5 space-y-1 rounded-control bg-error-soft px-3.5 py-3 text-sm font-medium text-error">
        <p class="flex items-start gap-2">
          <Icon name="lucide:circle-x" class="mt-0.5 size-4 shrink-0" />
          This order was {{ order.status }}{{ endNote ? `: ${endNote}` : '.' }}
        </p>
        <p class="pl-6 text-ink">
          {{ order.voucherUsableAgain ? 'Your voucher is active again, so you can order from another restaurant.' : 'Your voucher could not be reactivated because it had expired.' }}
          <NuxtLink v-if="order.voucherUsableAgain" to="/menu" class="font-semibold text-primary">Browse the menu</NuxtLink>
        </p>
      </div>

      <dl class="mt-6 space-y-1.5 border-t border-border pt-4 text-sm">
        <div class="flex justify-between gap-4"><dt class="text-muted">Delivering to</dt><dd class="text-right font-medium text-ink">{{ order.deliveryName }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Address</dt><dd class="max-w-[60%] text-right font-medium text-ink">{{ order.address }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Drop option</dt><dd class="font-medium text-ink">{{ DROP_OPTION_LABEL[order.dropOption] }}</dd></div>
        <div v-if="order.spiceLevel" class="flex justify-between gap-4"><dt class="text-muted">Spice</dt><dd class="font-medium text-ink">{{ SPICE_LABEL[order.spiceLevel] }}</dd></div>
        <div v-if="order.drinkChoice" class="flex justify-between gap-4"><dt class="text-muted">Drink</dt><dd class="font-medium text-ink">{{ order.drinkChoice }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Voucher used</dt><dd class="font-medium text-ink">{{ formatCurrency(order.amount, order.currency) }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-muted">Placed</dt><dd class="font-medium text-ink">{{ new Date(order.createdAt).toLocaleString() }}</dd></div>
      </dl>

      <div v-if="order.status === 'delivered'" class="mt-5 border-t border-border pt-5">
        <div v-if="order.disputeStatus" class="flex items-start gap-2 rounded-control bg-warning-soft px-3.5 py-3 text-sm font-medium text-ink">
          <Icon name="lucide:flag" class="mt-0.5 size-4 shrink-0 text-warning" />
          {{ order.disputeStatus === 'open' ? 'You reported a problem with this order. Our team is reviewing it.' : 'Our team has reviewed the problem you reported.' }}
        </div>
        <template v-else-if="!reportOpen">
          <p class="text-sm text-muted">Didn't receive your order?</p>
          <button class="mt-1.5 text-sm font-semibold text-error" @click="reportOpen = true">Report a problem</button>
        </template>
        <form v-else class="space-y-3" @submit.prevent="submitReport">
          <label for="report-note" class="block text-sm font-medium text-ink">Tell us what happened</label>
          <textarea
            id="report-note"
            v-model="reportNote"
            rows="3"
            maxlength="1000"
            class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="e.g. the order never arrived"
          />
          <div class="flex gap-2">
            <BaseButton type="button" variant="secondary" size="sm" @click="reportOpen = false">Cancel</BaseButton>
            <BaseButton type="submit" variant="danger" size="sm" :loading="reporting">Send report</BaseButton>
          </div>
        </form>
      </div>
    </BaseCard>
  </div>
</template>
