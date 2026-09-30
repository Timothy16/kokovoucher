<!-- app/pages/restaurant/walk-in.vue -->
<script setup lang="ts">
import type { Currency } from '#shared/types/models'

definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const api = useApi()
const { restaurant } = useAuth()

type Step = 'verify' | 'bill' | 'done'
const step = ref<Step>('verify')

// ---------- step 1: check the voucher ----------
const code = ref('')
const secretKey = ref('')
const verifying = ref(false)
const verifyError = ref('')
const mismatch = ref(false)
const voucher = ref<{ amount: number; currency: Currency; customerFirstName: string | null } | null>(null)

async function verify() {
  if (verifying.value || !code.value.trim() || !secretKey.value.trim()) return
  verifying.value = true
  verifyError.value = ''
  mismatch.value = false
  try {
    voucher.value = await api('/api/restaurant/walk-ins/verify', { method: 'POST', body: { code: code.value, secretKey: secretKey.value } })
    step.value = 'bill'
  } catch (e) {
    mismatch.value = (e as { data?: { data?: { reason?: string } } })?.data?.data?.reason === 'CURRENCY_MISMATCH'
    verifyError.value = apiErrorMessage(e, "Couldn't check this voucher. Please try again.")
  } finally {
    verifying.value = false
  }
}

// ---------- step 2: the bill (rule 10: credit = min(voucher, bill), remainder forfeited) ----------
const billAmount = ref('')
const bill = computed(() => Number(billAmount.value))
const billValid = computed(() => !!voucher.value && !!billAmount.value && isValidAmount(bill.value, voucher.value.currency))
const preview = computed(() => {
  if (!voucher.value || !billValid.value) return null
  const credited = Math.min(voucher.value.amount, bill.value)
  return { credited, forfeited: voucher.value.amount - credited, customerPays: Math.max(0, bill.value - voucher.value.amount) }
})

const completing = ref(false)
const completeError = ref('')
const result = ref<{ currency: Currency; billAmount: number; creditedAmount: number; forfeitedAmount: number } | null>(null)

async function complete() {
  if (completing.value || !billValid.value) return
  completing.value = true
  completeError.value = ''
  try {
    result.value = await api('/api/restaurant/walk-ins', { method: 'POST', body: { code: code.value, secretKey: secretKey.value, billAmount: bill.value } })
    step.value = 'done'
  } catch (e) {
    completeError.value = apiErrorMessage(e, "Couldn't complete the redemption. Please try again.")
  } finally {
    completing.value = false
  }
}

function reset() {
  step.value = 'verify'
  code.value = ''
  secretKey.value = ''
  billAmount.value = ''
  voucher.value = null
  result.value = null
  verifyError.value = ''
  completeError.value = ''
  mismatch.value = false
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Redeem a walk-in</h1>
      <p class="text-sm text-muted">Check the customer's voucher, then enter what they actually spent.</p>
    </div>

    <!-- step 1 -->
    <BaseCard v-if="step === 'verify'" class="animate-fade-up">
      <form class="space-y-4" @submit.prevent="verify">
        <BaseInput id="walkin-code" v-model="code" label="Voucher code" placeholder="AF7K-9QX2" icon="lucide:ticket" autocomplete="off" required />
        <BaseInput id="walkin-key" v-model="secretKey" label="Secret key (their KokoSend username)" icon="lucide:key-round" autocomplete="off" hint="Ask the customer to type it in themselves if possible." required />
        <p v-if="verifyError" role="alert" class="flex items-start gap-2 rounded-control px-3.5 py-2.5 text-xs font-medium" :class="mismatch ? 'bg-warning-soft text-ink' : 'bg-error-soft text-error'">
          <Icon :name="mismatch ? 'lucide:triangle-alert' : 'lucide:circle-alert'" class="mt-px size-4 shrink-0" :class="mismatch ? 'text-warning' : ''" />
          <span>{{ mismatch ? `This voucher is in a different currency, and your restaurant only takes ${restaurant?.currency} vouchers. It can't be used here.` : verifyError }}</span>
        </p>
        <BaseButton type="submit" size="lg" block :loading="verifying" :disabled="!code.trim() || !secretKey.trim()">Check voucher</BaseButton>
      </form>
    </BaseCard>

    <!-- step 2 -->
    <BaseCard v-else-if="step === 'bill' && voucher" class="animate-fade-up">
      <div class="rounded-control bg-success-soft px-4 py-3 text-center">
        <p class="flex items-center justify-center gap-1.5 text-xs font-semibold text-success">
          <Icon name="lucide:badge-check" class="size-4" />
          Valid voucher{{ voucher.customerFirstName ? ` for ${voucher.customerFirstName}` : '' }}
        </p>
        <p class="mt-1 text-3xl font-extrabold text-ink">{{ formatCurrency(voucher.amount, voucher.currency) }}</p>
      </div>

      <form class="mt-5 space-y-4" @submit.prevent="complete">
        <BaseInput id="walkin-bill" v-model="billAmount" label="Actual bill amount" type="number" icon="lucide:receipt" :placeholder="voucher.currency === 'USD' ? '0.00' : '0'" required />

        <dl v-if="preview" class="space-y-1.5 rounded-control border border-border bg-black/[0.02] px-4 py-3 text-sm">
          <div class="flex justify-between"><dt class="text-muted">Credited to your wallet</dt><dd class="font-bold text-success">{{ formatCurrency(preview.credited, voucher.currency) }}</dd></div>
          <div v-if="preview.customerPays > 0" class="flex justify-between"><dt class="text-muted">Customer pays you the rest</dt><dd class="font-semibold text-ink">{{ formatCurrency(preview.customerPays, voucher.currency) }}</dd></div>
          <div v-if="preview.forfeited > 0" class="flex justify-between"><dt class="text-muted">Unused voucher balance (forfeited)</dt><dd class="font-semibold text-warning">{{ formatCurrency(preview.forfeited, voucher.currency) }}</dd></div>
        </dl>
        <p v-else class="text-xs text-muted">
          You're credited whichever is smaller: the bill or the voucher value. Unused voucher balance is forfeited, not kept.
          {{ voucher.currency === 'USD' ? '' : 'Enter a whole amount.' }}
        </p>

        <p v-if="completeError" role="alert" class="flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-2.5 text-xs font-medium text-error">
          <Icon name="lucide:circle-alert" class="mt-px size-4 shrink-0" />
          {{ completeError }}
        </p>

        <div class="flex gap-3">
          <BaseButton type="button" variant="secondary" :disabled="completing" @click="reset">Cancel</BaseButton>
          <BaseButton type="submit" block size="lg" :loading="completing" :disabled="!billValid">Redeem voucher</BaseButton>
        </div>
      </form>
    </BaseCard>

    <!-- step 3 -->
    <BaseCard v-else-if="step === 'done' && result" class="animate-pop-in text-center">
      <div class="mx-auto flex size-20 items-center justify-center rounded-full bg-success-soft">
        <Icon name="lucide:check" class="size-10 text-success" />
      </div>
      <p class="mt-5 text-3xl font-extrabold text-success">{{ formatCurrency(result.creditedAmount, result.currency) }}</p>
      <p class="mt-1 text-sm text-muted">credited to your wallet</p>
      <dl class="mt-5 space-y-1.5 rounded-control border border-border px-4 py-3 text-left text-sm">
        <div class="flex justify-between"><dt class="text-muted">Bill</dt><dd class="font-semibold text-ink">{{ formatCurrency(result.billAmount, result.currency) }}</dd></div>
        <div v-if="result.billAmount > result.creditedAmount" class="flex justify-between"><dt class="text-muted">Collect from customer</dt><dd class="font-semibold text-ink">{{ formatCurrency(result.billAmount - result.creditedAmount, result.currency) }}</dd></div>
        <div v-if="result.forfeitedAmount > 0" class="flex justify-between"><dt class="text-muted">Forfeited</dt><dd class="font-semibold text-ink">{{ formatCurrency(result.forfeitedAmount, result.currency) }}</dd></div>
      </dl>
      <p class="mt-3 text-xs text-muted">The customer has been emailed a receipt.</p>
      <BaseButton class="mt-6" size="lg" block @click="reset">Redeem another</BaseButton>
    </BaseCard>
  </div>
</template>
