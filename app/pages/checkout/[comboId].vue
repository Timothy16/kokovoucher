<!-- app/pages/checkout/[comboId].vue -->
<script setup lang="ts">
import { drinkChoices } from '#shared/types/models'

definePageMeta({ layout: 'customer' })

const route = useRoute()
const api = useApi()
const comboId = route.params.comboId as string

const { data: item, pending, error, refresh } = useAsyncData(`checkout-${comboId}`, () => fetchMenuItem(comboId))

// ---------- steps, based on what this combo offers (rules 24, 25) ----------
type Step = 'spice' | 'drink' | 'delivery' | 'verify'
const drinkOptions = computed(() => (item.value ? drinkChoices(item.value) : []))
const steps = computed<Step[]>(() => {
  const s: Step[] = []
  if (item.value?.spice_option) s.push('spice')
  if (drinkOptions.value.length) s.push('drink')
  s.push('delivery', 'verify')
  return s
})
const stepIndex = ref(0)
const currentStep = computed(() => steps.value[stepIndex.value])
const next = () => stepIndex.value < steps.value.length - 1 && stepIndex.value++
const back = () => stepIndex.value > 0 && stepIndex.value--

// ---------- choices ----------
const spiceLevel = ref<SpiceLevel | null>(null)
const drinkChoice = ref<string | null>(null)

// ---------- delivery details (rule 26) ----------
const delivery = reactive({
  name: '',
  phone: '',
  whatsapp: '',
  whatsappSameAsPhone: true,
  houseName: '',
  houseNumber: '',
  floor: '',
  landmark: '',
  dropOption: 'door_drop' as DropOption,
  additionalInfo: ''
})
watch(
  () => [delivery.whatsappSameAsPhone, delivery.phone],
  () => {
    if (delivery.whatsappSameAsPhone) delivery.whatsapp = delivery.phone
  }
)
const phonePattern = /^\+?[0-9][0-9 ()-]{6,19}$/
const deliveryErrors = computed(() => {
  const e: Record<string, string> = {}
  if (delivery.phone.trim() && !phonePattern.test(delivery.phone.trim())) e.phone = 'Enter a valid phone number, e.g. +2348012345678.'
  if (delivery.whatsapp.trim() && !phonePattern.test(delivery.whatsapp.trim())) e.whatsapp = 'Enter a valid WhatsApp number.'
  return e
})
const deliveryValid = computed(
  () =>
    !!(delivery.name.trim() && delivery.phone.trim() && delivery.whatsapp.trim() && delivery.houseName.trim() && delivery.houseNumber.trim() && delivery.floor.trim()) &&
    !Object.keys(deliveryErrors.value).length
)
function continueDelivery() {
  // Enter in a field submits the form, so guard here rather than relying on the disabled button.
  if (deliveryValid.value) next()
}

// ---------- verify + place (voucher last) ----------
const code = ref('')
const secretKey = ref('')
const placing = ref(false)
const placeError = ref('')
const mismatchCurrency = ref<string | null>(null)
const orderReference = ref('')

async function placeOrder() {
  if (!item.value || placing.value || !code.value.trim() || !secretKey.value.trim()) return
  placing.value = true
  placeError.value = ''
  mismatchCurrency.value = null
  try {
    const res = await api<{ reference: string }>('/api/orders', {
      method: 'POST',
      body: {
        code: code.value,
        secretKey: secretKey.value,
        comboId: item.value.id,
        spiceLevel: item.value.spice_option ? spiceLevel.value : null,
        drinkChoice: drinkOptions.value.length ? drinkChoice.value : null,
        deliveryName: delivery.name,
        deliveryPhone: delivery.phone,
        deliveryWhatsapp: delivery.whatsapp,
        houseName: delivery.houseName,
        houseNumber: delivery.houseNumber,
        floor: delivery.floor,
        landmark: delivery.landmark || null,
        dropOption: delivery.dropOption,
        additionalInfo: delivery.additionalInfo || null
      }
    })
    orderReference.value = res.reference
  } catch (e) {
    const detail = (e as { data?: { data?: { reason?: string; voucherCurrency?: string } } })?.data?.data
    if (detail?.reason === 'CURRENCY_MISMATCH') mismatchCurrency.value = detail.voucherCurrency ?? null
    placeError.value = apiErrorMessage(e, 'Could not place your order. Please try again.')
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-md space-y-6 px-4 py-8 sm:px-0">
    <LoadingState v-if="pending && !item" :rows="3" />
    <ErrorState v-else-if="error" message="We couldn't load this combo." @retry="refresh()" />
    <EmptyState v-else-if="!item" icon="lucide:search-x" title="This combo isn't available" message="It may have sold out. Go back and pick another.">
      <BaseButton size="sm" @click="navigateTo('/menu')">Back to menu</BaseButton>
    </EmptyState>

    <!-- done -->
    <BaseCard v-else-if="orderReference" class="animate-pop-in text-center">
      <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft">
        <Icon name="lucide:check" class="size-8 text-success" />
      </div>
      <h1 class="mt-4 text-xl font-bold text-ink">Order placed!</h1>
      <p class="mt-1.5 text-sm text-muted">{{ item.restaurant_name }} has your order for {{ item.name }}. We've emailed you a confirmation.</p>
      <div class="mt-5 rounded-control border border-border bg-black/[0.02] px-4 py-3">
        <p class="text-xs text-muted">Order reference</p>
        <p class="mt-0.5 font-mono text-lg font-bold tracking-widest text-ink">{{ orderReference }}</p>
      </div>
      <p class="mt-3 text-xs text-muted">Keep this reference and your secret key to track your order.</p>
      <BaseButton class="mt-6" size="lg" block @click="navigateTo(`/track?ref=${orderReference}`)">
        Track my order
        <Icon name="lucide:arrow-right" class="size-4" />
      </BaseButton>
      <BaseButton class="mt-3" variant="secondary" block @click="navigateTo('/menu')">Back to menu</BaseButton>
    </BaseCard>

    <template v-else>
      <div class="flex items-center justify-between text-xs font-semibold text-muted">
        <span>Step {{ stepIndex + 1 }} of {{ steps.length }}</span>
        <div class="flex gap-1">
          <span v-for="i in steps.length" :key="i" class="h-1.5 w-6 rounded-full" :class="i - 1 <= stepIndex ? 'bg-primary' : 'bg-black/10'" />
        </div>
      </div>

      <BaseCard>
        <div class="flex items-center gap-3">
          <img :src="storagePublicUrl('combo-images', item.image_path) ?? undefined" :alt="item.name" class="size-12 shrink-0 rounded-control bg-primary-soft object-cover" />
          <div class="min-w-0">
            <p class="truncate font-bold text-ink">{{ item.name }}</p>
            <p class="truncate text-xs text-muted">{{ item.restaurant_name }} · {{ item.currency }}</p>
          </div>
        </div>
      </BaseCard>

      <!-- spice -->
      <BaseCard v-if="currentStep === 'spice'" class="animate-fade-up">
        <h1 class="text-lg font-bold text-ink">How spicy?</h1>
        <p class="mt-1 text-sm text-muted">{{ item.name }} can be made either way.</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button
            v-for="level in (['spicy', 'non_spicy'] as const)"
            :key="level"
            type="button"
            class="rounded-control border-2 px-4 py-5 text-center transition-colors"
            :class="spiceLevel === level ? 'border-primary bg-primary-soft' : 'border-border bg-white'"
            :aria-pressed="spiceLevel === level"
            @click="spiceLevel = level"
          >
            <Icon :name="level === 'spicy' ? 'lucide:flame' : 'lucide:leaf'" class="mx-auto size-6" :class="level === 'spicy' ? 'text-error' : 'text-success'" />
            <p class="mt-2 text-sm font-semibold text-ink">{{ SPICE_LABEL[level] }}</p>
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
        <p class="mt-1 text-sm text-muted">Comes with {{ item.name }}. Choose one.</p>
        <div class="mt-5 space-y-2">
          <button
            v-for="d in drinkOptions"
            :key="d"
            type="button"
            class="flex w-full items-center justify-between rounded-control border-2 px-4 py-3 text-left transition-colors"
            :class="drinkChoice === d ? 'border-primary bg-primary-soft' : 'border-border bg-white'"
            :aria-pressed="drinkChoice === d"
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
          <BaseButton v-if="stepIndex > 0" variant="secondary" @click="back">Back</BaseButton>
          <BaseButton block :disabled="!drinkChoice" @click="next">
            Continue
            <Icon name="lucide:arrow-right" class="size-4" />
          </BaseButton>
        </div>
      </BaseCard>

      <!-- delivery -->
      <BaseCard v-else-if="currentStep === 'delivery'" class="animate-fade-up">
        <h1 class="text-lg font-bold text-ink">Delivery details</h1>
        <p class="mt-1 text-sm text-muted">Where should this go? Delivery is free.</p>
        <form class="mt-5 space-y-4" @submit.prevent="continueDelivery">
          <BaseInput v-model="delivery.name" label="Full name" icon="lucide:user" autocomplete="name" required />
          <BaseInput v-model="delivery.phone" label="Phone number" type="tel" icon="lucide:phone" placeholder="+234…" autocomplete="tel" :error="deliveryErrors.phone" required />
          <div>
            <BaseInput v-model="delivery.whatsapp" label="WhatsApp number" type="tel" icon="lucide:message-circle" :disabled="delivery.whatsappSameAsPhone" :error="deliveryErrors.whatsapp" required />
            <label class="mt-1.5 flex items-center gap-2 text-xs text-muted">
              <input v-model="delivery.whatsappSameAsPhone" type="checkbox" class="rounded border-border text-primary focus:ring-primary/30" />
              Same as phone number
            </label>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <BaseInput v-model="delivery.houseName" label="House / apartment name" icon="lucide:home" required />
            <BaseInput v-model="delivery.houseNumber" label="House number" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <BaseInput v-model="delivery.floor" label="Floor" required />
            <BaseInput v-model="delivery.landmark" label="Nearest landmark (optional)" />
          </div>

          <div>
            <span class="mb-1.5 block text-sm font-medium text-ink">Drop option</span>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="opt in (['door_drop', 'leave_at_gate'] as const)"
                :key="opt"
                type="button"
                class="rounded-control border-2 px-3 py-2.5 text-sm font-semibold transition-colors"
                :class="delivery.dropOption === opt ? 'border-primary bg-primary-soft text-primary-hover' : 'border-border bg-white text-ink'"
                :aria-pressed="delivery.dropOption === opt"
                @click="delivery.dropOption = opt"
              >
                {{ DROP_OPTION_LABEL[opt] }}
              </button>
            </div>
          </div>

          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-ink">Additional information (optional)</span>
            <textarea
              v-model="delivery.additionalInfo"
              rows="2"
              maxlength="500"
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

      <!-- verify + place -->
      <BaseCard v-else-if="currentStep === 'verify'" class="animate-fade-up">
        <h1 class="text-lg font-bold text-ink">Pay with your voucher</h1>
        <p class="mt-1 text-sm text-muted">Last step. Your secret key is your KokoSend username.</p>

        <form class="mt-5 space-y-4" @submit.prevent="placeOrder">
          <BaseInput v-model="code" label="Voucher code" placeholder="AF7K-9QX2" icon="lucide:ticket" autocomplete="off" required />
          <BaseInput v-model="secretKey" label="Secret key (KokoSend username)" icon="lucide:key-round" autocomplete="off" required />
          <div v-if="placeError" role="alert" class="space-y-2 rounded-control px-3.5 py-3 text-xs font-medium" :class="mismatchCurrency ? 'bg-warning-soft text-ink' : 'bg-error-soft text-error'">
            <p class="flex items-start gap-2">
              <Icon :name="mismatchCurrency ? 'lucide:triangle-alert' : 'lucide:circle-alert'" class="mt-px size-4 shrink-0" :class="mismatchCurrency ? 'text-warning' : ''" />
              {{ placeError }}
            </p>
            <NuxtLink v-if="mismatchCurrency" :to="`/menu?currency=${mismatchCurrency}`" class="inline-flex items-center gap-1 font-semibold text-primary">
              See restaurants that accept {{ mismatchCurrency }}
              <Icon name="lucide:arrow-right" class="size-3.5" />
            </NuxtLink>
          </div>
          <p class="text-xs text-muted">Your whole voucher is used for this order. Delivery is free.</p>
          <div class="flex gap-3">
            <BaseButton type="button" variant="secondary" :disabled="placing" @click="back">Back</BaseButton>
            <BaseButton type="submit" block :loading="placing" :disabled="!code.trim() || !secretKey.trim()">Place order</BaseButton>
          </div>
        </form>
      </BaseCard>
    </template>
  </div>
</template>
