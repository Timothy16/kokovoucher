<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { currentRestaurant, redeemVoucher } = useMockDb()
const toast = useToast()

const code = ref('')
const scanning = ref(false)
const submitting = ref(false)
type Result = { ok: true; voucher: { code: string; amount: number; currency: 'NGN' | 'KES' | 'USD'; restaurantName: string } } | { ok: false; reason: string }
const result = ref<Result | null>(null)

const reasonCopy: Record<string, { title: string; message: string }> = {
  NOT_FOUND: { title: 'Voucher not found', message: 'Double-check the code and try again.' },
  ALREADY_REDEEMED: { title: 'Already redeemed', message: 'This voucher has already been used.' },
  EXPIRED: { title: 'Voucher expired', message: "Its 24-hour window has passed." },
  WRONG_RESTAURANT: { title: 'Wrong restaurant', message: 'This voucher belongs to a different restaurant.' },
  NOT_ACTIVE: { title: 'Not activated yet', message: 'The customer hasn’t confirmed this voucher with their code.' }
}

async function submit() {
  if (!code.value.trim() || !currentRestaurant.value) return
  submitting.value = true
  await new Promise((r) => setTimeout(r, 400))
  const res = redeemVoucher(code.value, currentRestaurant.value.id)
  submitting.value = false

  if (res.ok && res.voucher) {
    result.value = {
      ok: true,
      voucher: { code: res.voucher.code, amount: res.voucher.amount, currency: res.voucher.currency, restaurantName: res.voucher.restaurantName }
    }
    toast.success('Voucher redeemed', formatCurrency(res.voucher.amount, res.voucher.currency))
  } else {
    result.value = { ok: false, reason: res.reason ?? 'NOT_FOUND' }
  }
}

function onDecode(value: string) {
  scanning.value = false
  code.value = value
  submit()
}

function reset() {
  result.value = null
  code.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Redeem a voucher</h1>
      <p class="text-sm text-muted">Scan the customer's QR or type their code.</p>
    </div>

    <Transition name="result-pop" mode="out-in">
      <BaseCard v-if="result?.ok" key="ok" class="text-center">
        <div class="mx-auto flex size-20 items-center justify-center rounded-full bg-success-soft animate-pop-in">
          <Icon name="lucide:check" class="size-10 text-success" />
        </div>
        <p class="mt-5 text-3xl font-extrabold text-success">{{ formatCurrency(result.voucher.amount, result.voucher.currency) }}</p>
        <p class="mt-1 font-mono text-sm text-muted">{{ result.voucher.code }}</p>
        <p class="mt-4 text-sm text-muted">Redeemed successfully — give the customer their order.</p>
        <BaseButton class="mt-6" size="lg" block @click="reset">Redeem another</BaseButton>
      </BaseCard>

      <BaseCard v-else-if="result && !result.ok" key="err" class="text-center">
        <div class="mx-auto flex size-20 items-center justify-center rounded-full bg-error-soft animate-pop-in">
          <Icon name="lucide:x" class="size-10 text-error" />
        </div>
        <p class="mt-5 text-xl font-bold text-error">{{ reasonCopy[result.reason]?.title ?? 'Could not redeem' }}</p>
        <p class="mt-1.5 text-sm text-muted">{{ reasonCopy[result.reason]?.message }}</p>
        <BaseButton class="mt-6" size="lg" block variant="secondary" @click="reset">Try again</BaseButton>
      </BaseCard>

      <div v-else key="form" class="space-y-4">
        <QrScanner v-if="scanning" @decode="onDecode" @close="scanning = false" />

        <template v-else>
          <BaseCard>
            <form class="space-y-4" @submit.prevent="submit">
              <BaseInput v-model="code" label="Voucher code" placeholder="AF7K-9QX2" icon="lucide:hash" required />
              <BaseButton type="submit" size="lg" block :loading="submitting" :disabled="!code.trim()">Redeem</BaseButton>
            </form>
          </BaseCard>
          <button
            class="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-primary/40 bg-primary-soft/40 py-4 text-sm font-semibold text-primary-hover transition-colors hover:bg-primary-soft"
            @click="scanning = true"
          >
            <Icon name="lucide:scan-line" class="size-5" />
            Scan QR instead
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.result-pop-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.result-pop-enter-from {
  opacity: 0;
  transform: scale(0.96);
}
</style>
