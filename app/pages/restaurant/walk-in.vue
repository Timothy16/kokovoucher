<!-- app/pages/restaurant/walk-in.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

import type { Voucher } from '~/composables/useMockDb'

const { currentRestaurant, verifyVoucherAccess, completeWalkIn } = useMockDb()
const toast = useToast()

type Step = 'verify' | 'bill' | 'result'
const step = ref<Step>('verify')
const scanning = ref(false)

const code = ref('')
const secretKey = ref('')
const verifying = ref(false)
const verifyError = ref('')
const currencyMismatch = ref(false)
const voucher = ref<Voucher | null>(null)

const verifyReasonCopy: Record<string, string> = {
  NOT_FOUND: "We couldn't find a voucher with that code.",
  WRONG_CREDENTIALS: "That code or secret key doesn't look right.",
  LOCKED: 'Too many incorrect attempts — this voucher is now locked.',
  EXPIRED: 'This voucher has expired.',
  ALREADY_USED: 'This voucher has already been used.'
}

async function submitVerify() {
  if (!code.value.trim() || !secretKey.value.trim() || !currentRestaurant.value) return
  verifyError.value = ''
  currencyMismatch.value = false
  verifying.value = true
  await new Promise((r) => setTimeout(r, 350))
  const res = verifyVoucherAccess(code.value, secretKey.value)
  verifying.value = false

  if (!res.ok || !res.voucher) {
    let msg = verifyReasonCopy[res.reason ?? 'NOT_FOUND'] ?? 'Could not verify this voucher.'
    if (res.reason === 'WRONG_CREDENTIALS' && res.attemptsLeft !== undefined) msg += ` ${res.attemptsLeft} attempt${res.attemptsLeft === 1 ? '' : 's'} left.`
    verifyError.value = msg
    return
  }
  if (res.voucher.currency !== currentRestaurant.value.currency) {
    currencyMismatch.value = true
    return
  }
  voucher.value = res.voucher
  step.value = 'bill'
}

function onDecode(value: string) {
  scanning.value = false
  code.value = value
  submitVerify()
}

const billAmount = ref('')
const completing = ref(false)
const result = ref<{ credited: number; forfeited: number } | null>(null)

async function submitBill() {
  if (!voucher.value || !currentRestaurant.value || !billAmount.value || Number(billAmount.value) <= 0) return
  completing.value = true
  await new Promise((r) => setTimeout(r, 450))
  const res = completeWalkIn({ code: code.value, secretKey: secretKey.value, restaurantId: currentRestaurant.value.id, billAmount: Number(billAmount.value) })
  completing.value = false
  if (!res.ok || !res.walkIn) {
    toast.error('Could not complete redemption')
    return
  }
  result.value = { credited: res.walkIn.creditedAmount, forfeited: res.walkIn.forfeitedAmount }
  step.value = 'result'
  toast.success('Redeemed', `${formatCurrency(res.walkIn.creditedAmount, voucher.value.currency)} credited to your wallet.`)
}

function reset() {
  step.value = 'verify'
  code.value = ''
  secretKey.value = ''
  billAmount.value = ''
  voucher.value = null
  result.value = null
  verifyError.value = ''
  currencyMismatch.value = false
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Redeem a walk-in</h1>
      <p class="text-sm text-muted">Verify the customer's voucher, then enter what they actually spent.</p>
    </div>

    <!-- verify -->
    <template v-if="step === 'verify'">
      <QrScanner v-if="scanning" @decode="onDecode" @close="scanning = false" />
      <template v-else>
        <BaseCard>
          <form class="space-y-4" @submit.prevent="submitVerify">
            <BaseInput v-model="code" label="Voucher code" placeholder="AF7K-9QX2" icon="lucide:ticket" required />
            <BaseInput v-model="secretKey" label="Secret key (KokoSend username)" icon="lucide:key-round" required />
            <p v-if="verifyError" role="alert" class="flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-2.5 text-xs font-medium text-error">
              <Icon name="lucide:circle-alert" class="mt-px size-4 shrink-0" />
              {{ verifyError }}
            </p>
            <div v-if="currencyMismatch" class="flex items-start gap-2 rounded-control bg-warning-soft px-3.5 py-3 text-xs font-medium text-ink">
              <Icon name="lucide:triangle-alert" class="mt-px size-4 shrink-0 text-warning" />
              This voucher's currency doesn't match your restaurant's ({{ currentRestaurant?.currency }}). It can't be redeemed here.
            </div>
            <BaseButton type="submit" size="lg" block :loading="verifying" :disabled="!code.trim() || !secretKey.trim()">Verify voucher</BaseButton>
          </form>
        </BaseCard>
        <button
          class="mt-4 flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-primary/40 bg-primary-soft/40 py-4 text-sm font-semibold text-primary-hover transition-colors hover:bg-primary-soft"
          @click="scanning = true"
        >
          <Icon name="lucide:scan-line" class="size-5" />
          Scan QR instead
        </button>
      </template>
    </template>

    <!-- bill -->
    <BaseCard v-else-if="step === 'bill'" class="animate-fade-up">
      <div class="rounded-control bg-primary-soft/50 px-4 py-3 text-center">
        <p class="text-xs text-muted">Voucher value</p>
        <p class="text-2xl font-extrabold text-ink">{{ formatCurrency(voucher!.amount, voucher!.currency) }}</p>
      </div>
      <form class="mt-5 space-y-4" @submit.prevent="submitBill">
        <BaseInput v-model="billAmount" label="Actual bill amount" type="number" icon="lucide:receipt" placeholder="0.00" required />
        <p class="text-xs text-muted">
          You'll be credited whichever is smaller — the bill or the voucher value. Any unused voucher balance is forfeited, not banked.
        </p>
        <BaseButton type="submit" size="lg" block :loading="completing" :disabled="!billAmount || Number(billAmount) <= 0">Complete redemption</BaseButton>
      </form>
    </BaseCard>

    <!-- result -->
    <BaseCard v-else class="animate-pop-in text-center">
      <div class="mx-auto flex size-20 items-center justify-center rounded-full bg-success-soft animate-pop-in">
        <Icon name="lucide:check" class="size-10 text-success" />
      </div>
      <p class="mt-5 text-3xl font-extrabold text-success">{{ formatCurrency(result!.credited, voucher!.currency) }}</p>
      <p class="mt-1 text-sm text-muted">credited to your wallet</p>
      <p v-if="result!.forfeited > 0" class="mt-3 text-xs text-muted">{{ formatCurrency(result!.forfeited, voucher!.currency) }} unused balance was forfeited.</p>
      <BaseButton class="mt-6" size="lg" block @click="reset">Redeem another</BaseButton>
    </BaseCard>
  </div>
</template>
