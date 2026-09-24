<!-- app/pages/checkout/[comboId].vue -->
<script setup lang="ts">
definePageMeta({ layout: 'customer' })

import type { Voucher, SpiceLevel, DropOption } from '~/composables/useMockDb'

const route = useRoute()
const { publicMenu, verifyVoucherAccess, placeOrder } = useMockDb()

const row = computed(() => publicMenu.value.find((r) => r.combo.id === route.params.comboId))

// ---------- dynamic step list, based on what this combo actually offers ----------
type Step = 'spice' | 'drink' | 'delivery' | 'verify' | 'done'
const steps = computed<Step[]>(() => {
  const s: Step[] = []
  if (row.value?.combo.spiceOption) s.push('spice')
  if (row.value && (row.value.combo.sodaOptions.length || row.value.combo.waterOption)) s.push('drink')
  s.push('delivery', 'verify')
  return s
})
const stepIndex = ref(0)
const currentStep = computed<Step>(() => steps.value[stepIndex.value] ?? 'done')
const stepNumber = computed(() => stepIndex.value + 1)
const stepCount = computed(() => steps.value.length)

function next() {
  if (stepIndex.value < steps.value.length - 1) stepIndex.value++
}
function continueDelivery() {
  // Guard explicitly rather than relying on the submit button's disabled state alone —
  // pressing Enter inside a text field can still fire the form's submit handler.
  if (!deliveryValid.value) return
  next()
}
function back() {
  if (stepIndex.value > 0) stepIndex.value--
}

// ---------- step: spice ----------
const spiceLevel = ref<SpiceLevel | null>(null)

// ---------- step: drink ----------
const drinkChoice = ref<string | null>(null)
const drinkOptions = computed(() => {
  if (!row.value) return []
  return [...row.value.combo.sodaOptions, ...(row.value.combo.waterOption ? ['Water'] : [])]
})

// ---------- step: delivery ----------
const deliveryName = ref('')
const deliveryPhone = ref('')
const deliveryWhatsapp = ref('')
const whatsappSameAsPhone = ref(true)
watch([whatsappSameAsPhone, deliveryPhone], () => {
  if (whatsappSameAsPhone.value) deliveryWhatsapp.value = deliveryPhone.value
})
const houseName = ref('')
const houseNumber = ref('')
const floor = ref('')
const landmark = ref('')
const dropOption = ref<DropOption>('door_drop')
const additionalInfo = ref('')

const deliveryValid = computed(() =>
  deliveryName.value.trim() && deliveryPhone.value.trim() && deliveryWhatsapp.value.trim() &&
  houseName.value.trim() && houseNumber.value.trim() && floor.value.trim()
)

// ---------- step: verify + submit ----------
const code = ref('')
const secretKey = ref('')
const verifying = ref(false)
const verifyError = ref('')
const currencyMismatch = ref(false)
const voucher = ref<Voucher | null>(null)
const orderReference = ref('')

const verifyReasonCopy: Record<string, string> = {
  NOT_FOUND: "We couldn't find a voucher with that code.",
  WRONG_CREDENTIALS: "That code or secret key doesn't look right.",
  LOCKED: 'Too many incorrect attempts — this voucher is now locked. Contact support for help.',
  EXPIRED: 'This voucher has expired.',
  ALREADY_USED: 'This voucher has already been used.',
  COMBO_UNAVAILABLE: 'This combo just became unavailable. Please pick another.',
  RESTAURANT_UNAVAILABLE: 'This restaurant is temporarily unavailable.',
  VOUCHER_NOT_AVAILABLE: 'This voucher is no longer available to use.',
  SPICE_LEVEL_REQUIRED: 'Go back and choose a spice level.',
  DRINK_CHOICE_REQUIRED: 'Go back and choose a drink.'
}

async function submitOrder() {
  if (!code.value.trim() || !secretKey.value.trim() || !row.value) return
  verifyError.value = ''
  currencyMismatch.value = false
  verifying.value = true
  await new Promise((r) => setTimeout(r, 400))

  // Verify first so a currency mismatch or bad code shows a clear message before we attempt to place.
  const check = verifyVoucherAccess(code.value, secretKey.value)
  if (!check.ok || !check.voucher) {
    verifying.value = false
    let msg = verifyReasonCopy[check.reason ?? 'NOT_FOUND'] ?? 'Could not verify your voucher.'
    if (check.reason === 'WRONG_CREDENTIALS' && check.attemptsLeft !== undefined) {
      msg += ` ${check.attemptsLeft} attempt${check.attemptsLeft === 1 ? '' : 's'} left.`
    }
    verifyError.value = msg
    return
  }
  voucher.value = check.voucher
  if (check.voucher.currency !== row.value.restaurant.currency) {
    verifying.value = false
    currencyMismatch.value = true
    return
  }

  const res = placeOrder({
    code: code.value,
    secretKey: secretKey.value,
    comboId: row.value.combo.id,
    spiceLevel: spiceLevel.value,
    drinkChoice: drinkChoice.value,
    deliveryName: deliveryName.value,
    deliveryPhone: deliveryPhone.value,
    deliveryWhatsapp: deliveryWhatsapp.value,
    houseName: houseName.value,
    houseNumber: houseNumber.value,
    floor: floor.value,
    landmark: landmark.value || null,
    dropOption: dropOption.value,
    additionalInfo: additionalInfo.value || null
  })
  verifying.value = false

  if (!res.ok || !res.order) {
    verifyError.value = verifyReasonCopy[res.reason ?? ''] ?? 'Could not place this order.'
    return
  }

  orderReference.value = res.order.reference
  stepIndex.value = steps.value.length // past the last real step -> renders 'done'
}
const isDone = computed(() => stepIndex.value >= steps.value.length)
</script>

<template>
  <div class="mx-auto w-full max-w-md space-y-6 px-4 py-8 sm:px-0">
    <EmptyState v-if="!row" icon="lucide:search-x" title="Combo not found" message="Go back and pick another combo." />

    <template v-else>
      <div v-if="!isDone" class="flex items-center justify-between text-xs font-semibold text-muted">
        <span>Step {{ stepNumber }} of {{ stepCount }}</span>
        <div class="flex gap-1">
          <span v-for="i in stepCount" :key="i" class="h-1.5 w-6 rounded-full" :class="i - 1 <= stepIndex ? 'bg-primary' : 'bg-black/10'" />
        </div>
      </div>

      <BaseCard v-if="!isDone">
        <div class="flex items-center gap-3">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-control bg-primary-soft">
            <Icon name="lucide:utensils-crossed" class="size-5 text-primary" />
          </div>
          <div class="min-w-0">
            <p class="truncate font-bold text-ink">{{ row.combo.name }}</p>
            <p class="truncate text-xs text-muted">{{ row.restaurant.name }} · {{ row.restaurant.currency }}</p>
          </div>
        </div>
      </BaseCard>

      <!-- spice -->
      <BaseCard v-if="currentStep === 'spice'" class="animate-fade-up">
        <h1 class="text-lg font-bold text-ink">How spicy?</h1>
        <p class="mt-1 text-sm text-muted">{{ row.combo.name }} can be made either way.</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-control border-2 px-4 py-5 text-center transition-colors"
            :class="spiceLevel === 'spicy' ? 'border-primary bg-primary-soft' : 'border-border bg-white'"
            @click="spiceLevel = 'spicy'"
          >
            <Icon name="lucide:flame" class="mx-auto size-6 text-error" />
            <p class="mt-2 text-sm font-semibold text-ink">Spicy</p>
          </button>
          <button
            type="button"
            class="rounded-control border-2 px-4 py-5 text-center transition-colors"
            :class="spiceLevel === 'non_spicy' ? 'border-primary bg-primary-soft' : 'border-border bg-white'"
            @click="spiceLevel = 'non_spicy'"
          >
            <Icon name="lucide:leaf" class="mx-auto size-6 text-success" />
            <p class="mt-2 text-sm font-semibold text-ink">Non-spicy</p>
          </button>
        </div>
        <BaseButton class="mt-6" size="lg" block :disabled="!spiceLevel" @click="next">
          Continue
          <Icon name="lucide:arrow-right" class="size-4" />
        </BaseButton>
      </BaseCard>

      <!-- drink -->
      <BaseCard v-else-if="currentStep === 'drink'" class="animate-fade-up">
        <h1 class="text-lg font-bold text-ink">Pick a drink</h1>
        <p class="mt-1 text-sm text-muted">Comes with {{ row.combo.name }} — choose one.</p>
        <div class="mt-5 space-y-2">
          <button
            v-for="d in drinkOptions"
            :key="d"
            type="button"
            class="flex w-full items-center justify-between rounded-control border-2 px-4 py-3 text-left transition-colors"
            :class="drinkChoice === d ? 'border-primary bg-primary-soft' : 'border-border bg-white'"
            @click="drinkChoice = d"
          >
            <span class="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <Icon :name="d === 'Water' ? 'lucide:droplet' : 'lucide:cup-soda'" class="size-4 text-primary" />
              {{ d }}
            </span>
            <Icon v-if="drinkChoice === d" name="lucide:check" class="size-4 text-primary" />
          </button>
        </div>
        <div class="mt-6 flex gap-3">
          <BaseButton variant="secondary" @click="back">Back</BaseButton>
          <BaseButton block :disabled="!drinkChoice" @click="next">
            Continue
            <Icon name="lucide:arrow-right" class="size-4" />
          </BaseButton>
        </div>
      </BaseCard>

      <!-- delivery -->
      <BaseCard v-else-if="currentStep === 'delivery'" class="animate-fade-up">
        <h1 class="text-lg font-bold text-ink">Delivery details</h1>
        <p class="mt-1 text-sm text-muted">Where should this go?</p>
        <form class="mt-5 space-y-4" @submit.prevent="continueDelivery">
          <BaseInput v-model="deliveryName" label="Full name" icon="lucide:user" required />
          <BaseInput v-model="deliveryPhone" label="Phone number" type="tel" icon="lucide:phone" required />
          <div>
            <BaseInput v-model="deliveryWhatsapp" label="WhatsApp number" type="tel" icon="lucide:message-circle" :disabled="whatsappSameAsPhone" required />
            <label class="mt-1.5 flex items-center gap-2 text-xs text-muted">
              <input v-model="whatsappSameAsPhone" type="checkbox" class="rounded border-border text-primary focus:ring-primary/30" />
              Same as phone number
            </label>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <BaseInput v-model="houseName" label="House / apartment name" icon="lucide:home" required />
            <BaseInput v-model="houseNumber" label="House number" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <BaseInput v-model="floor" label="Floor" required />
            <BaseInput v-model="landmark" label="Nearest landmark (optional)" />
          </div>

          <div>
            <span class="mb-1.5 block text-sm font-medium text-ink">Drop option</span>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="rounded-control border-2 px-3 py-2.5 text-sm font-semibold transition-colors"
                :class="dropOption === 'door_drop' ? 'border-primary bg-primary-soft text-primary-hover' : 'border-border bg-white text-ink'"
                @click="dropOption = 'door_drop'"
              >
                Door drop
              </button>
              <button
                type="button"
                class="rounded-control border-2 px-3 py-2.5 text-sm font-semibold transition-colors"
                :class="dropOption === 'leave_at_gate' ? 'border-primary bg-primary-soft text-primary-hover' : 'border-border bg-white text-ink'"
                @click="dropOption = 'leave_at_gate'"
              >
                Leave at the gate
              </button>
            </div>
          </div>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-ink">Additional information (optional)</span>
            <textarea
              v-model="additionalInfo"
              rows="2"
              placeholder="e.g. call before arriving"
              class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>

          <div class="flex gap-3">
            <BaseButton v-if="stepIndex > 0" type="button" variant="secondary" @click="back">Back</BaseButton>
            <BaseButton type="submit" block :disabled="!deliveryValid">
              Continue
              <Icon name="lucide:arrow-right" class="size-4" />
            </BaseButton>
          </div>
        </form>
      </BaseCard>

      <!-- verify + submit -->
      <BaseCard v-else-if="currentStep === 'verify'" class="animate-fade-up">
        <h1 class="text-lg font-bold text-ink">Enter your voucher</h1>
        <p class="mt-1 text-sm text-muted">Last step — your secret key is your KokoSend username.</p>

        <form class="mt-5 space-y-4" @submit.prevent="submitOrder">
          <BaseInput v-model="code" label="Voucher code" placeholder="AF7K-9QX2" icon="lucide:ticket" required />
          <BaseInput v-model="secretKey" label="Secret key (KokoSend username)" icon="lucide:key-round" required />
          <p v-if="verifyError" role="alert" class="flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-2.5 text-xs font-medium text-error">
            <Icon name="lucide:circle-alert" class="mt-px size-4 shrink-0" />
            {{ verifyError }}
          </p>
          <div v-if="currencyMismatch" class="space-y-3 rounded-control bg-warning-soft px-3.5 py-3 text-xs font-medium text-ink">
            <p class="flex items-start gap-2">
              <Icon name="lucide:triangle-alert" class="mt-px size-4 shrink-0 text-warning" />
              This voucher is in a different currency than {{ row.restaurant.name }}. It can only be used at restaurants in the same currency.
            </p>
            <NuxtLink :to="`/menu?currency=${voucher?.currency}`" class="inline-flex items-center gap-1 font-semibold text-primary">
              See matching restaurants
              <Icon name="lucide:arrow-right" class="size-3.5" />
            </NuxtLink>
          </div>
          <p class="text-xs text-muted">This uses your full voucher for this order.</p>
          <div class="flex gap-3">
            <BaseButton type="button" variant="secondary" @click="back">Back</BaseButton>
            <BaseButton type="submit" block :loading="verifying" :disabled="!code.trim() || !secretKey.trim()">Confirm order</BaseButton>
          </div>
        </form>
      </BaseCard>

      <!-- done -->
      <BaseCard v-else class="animate-pop-in text-center">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft">
          <Icon name="lucide:check" class="size-8 text-success" />
        </div>
        <h1 class="mt-4 text-xl font-bold text-ink">Order placed!</h1>
        <p class="mt-1.5 text-sm text-muted">{{ row.restaurant.name }} has been notified and will get your {{ row.combo.name }} ready.</p>
        <div class="mt-5 rounded-control border border-border bg-black/[0.02] px-4 py-3">
          <p class="text-xs text-muted">Order reference</p>
          <p class="mt-0.5 font-mono text-lg font-bold tracking-widest text-ink">{{ orderReference }}</p>
        </div>
        <p class="mt-3 text-xs text-muted">Keep this reference and your secret key to track your order.</p>
        <BaseButton class="mt-6" size="lg" block @click="navigateTo('/track')">
          Track my order
          <Icon name="lucide:arrow-right" class="size-4" />
        </BaseButton>
        <BaseButton class="mt-3" variant="secondary" block @click="navigateTo('/menu')">Back to menu</BaseButton>
      </BaseCard>
    </template>
  </div>
</template>
