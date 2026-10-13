<!-- app/components/ui/PhoneInput.vue -->
<!-- Country picker + number. v-model is the number in international form ("+2348030000001");
     check it with toE164() before saving. Typing a local "0803…" drops the leading 0; pasting
     "+254…" switches the country. The country follows `defaultCountry` until the user picks one. -->
<script setup lang="ts">
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'
import type { PhoneCountry } from '#shared/utils/phone'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
    defaultCountry?: PhoneCountry
    /** Start of the confirmation line, e.g. "WhatsApp messages will go to". Empty hides it. */
    confirmLabel?: string
    autocomplete?: string
  }>(),
  { defaultCountry: 'NG', confirmLabel: 'Messages will go to', autocomplete: 'tel-national' }
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uid = useId()
const countries = phoneCountries()

/** Reads a stored value; older local-format numbers ("0803…") are read in the default country. */
const readStored = (value: string) =>
  value ? (parsePhoneNumberFromString(value) ?? parsePhoneNumberFromString(value, props.defaultCountry)) : undefined

const initial = readStored(props.modelValue)
const country = ref<PhoneCountry>(initial?.country ?? props.defaultCountry)
const national = ref(initial ? initial.formatNational() : '')
const countryChosen = ref(!!initial?.country)
const touched = ref(false)

let lastEmitted = props.modelValue
// An older local-format number becomes international as soon as the form opens.
onMounted(() => {
  if (initial?.isValid() && initial.number !== props.modelValue) emitValue()
})
function emitValue() {
  const raw = national.value.trim()
  const parsed = raw ? parsePhoneNumberFromString(raw, country.value) : undefined
  lastEmitted = !raw ? '' : parsed ? parsed.number : `${dialCode(country.value)}${raw.replace(/\D/g, '')}`
  emit('update:modelValue', lastEmitted)
}

function onNumberInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  // A full international number (pasted or typed with + / 00): take the country from it.
  if (/^\s*(\+|00)/.test(value)) {
    const parsed = parsePhoneNumberFromString(value.trim().replace(/^00/, '+'))
    if (parsed?.country) {
      country.value = parsed.country
      countryChosen.value = true
      national.value = parsed.formatNational()
      return emitValue()
    }
  }
  national.value = value
  emitValue()
}

function onCountryChange(e: Event) {
  country.value = (e.target as HTMLSelectElement).value as PhoneCountry
  countryChosen.value = true
  emitValue()
}

// Follow the form's default (e.g. the voucher currency) until the user picks a country themselves,
// and only while the number is empty, so a typed number never silently changes meaning.
watch(
  () => props.defaultCountry,
  (next) => {
    if (!countryChosen.value && !national.value.trim()) country.value = next
  }
)

// Changes made by the parent, not by typing here: a reset ("Issue another") or a mirrored value
// ("WhatsApp same as phone number").
watch(
  () => props.modelValue,
  (value) => {
    if (value === lastEmitted) return
    lastEmitted = value
    const parsed = readStored(value)
    if (parsed?.country) country.value = parsed.country
    else if (!value) country.value = props.defaultCountry
    const dial = dialCode(country.value)
    national.value = parsed ? parsed.formatNational() : value.startsWith(dial) ? value.slice(dial.length) : value
    countryChosen.value = !!parsed?.country
  }
)

const e164 = computed(() => (national.value.trim() ? toE164(national.value, country.value) : null))
const problem = computed(() => (touched.value ? phoneProblem(national.value, country.value) : null))
const shownError = computed(() => props.error || problem.value || '')
</script>

<template>
  <div>
    <label v-if="label" :for="`${uid}-number`" class="mb-1.5 block text-sm font-medium text-ink">{{ label }}</label>
    <div
      class="flex rounded-control border bg-white transition-colors focus-within:ring-2"
      :class="[shownError ? 'border-error focus-within:ring-error/15' : 'border-border focus-within:border-primary focus-within:ring-primary/15', disabled ? 'opacity-60' : '']"
    >
      <!-- Visible: flag + code. Underneath: the native select, so phones show their own picker. -->
      <div class="relative flex shrink-0 items-center gap-1.5 border-r border-border pl-3 pr-2 text-sm font-medium text-ink">
        <span aria-hidden="true">{{ countryFlag(country) }}</span>
        <span>{{ dialCode(country) }}</span>
        <Icon name="lucide:chevron-down" class="size-3.5 text-muted" aria-hidden="true" />
        <select
          :id="`${uid}-country`"
          :value="country"
          :disabled="disabled"
          :aria-label="`Country code for ${label ?? 'phone number'}`"
          class="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          @change="onCountryChange"
        >
          <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }} ({{ c.dial }})</option>
        </select>
      </div>
      <input
        :id="`${uid}-number`"
        :value="national"
        type="tel"
        inputmode="tel"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        :placeholder="country === 'NG' ? '803 000 0001' : 'Phone number'"
        class="min-w-0 flex-1 rounded-r-control bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 disabled:cursor-not-allowed"
        @input="onNumberInput"
        @blur="touched = true"
      />
    </div>
    <p v-if="shownError" class="mt-1.5 text-xs font-medium text-error">{{ shownError }}</p>
    <p v-else-if="e164 && confirmLabel" class="mt-1.5 flex items-center gap-1 text-xs text-success">
      <Icon name="lucide:check" class="size-3.5" />
      {{ confirmLabel }} <span class="font-semibold">{{ formatPhone(e164) }}</span>
    </p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-muted">{{ hint }}</p>
  </div>
</template>
