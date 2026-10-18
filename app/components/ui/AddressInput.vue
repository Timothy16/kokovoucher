<!-- app/components/ui/AddressInput.vue -->
<!-- Address field with MapTiler suggestions. v-model is the address text; v-model:location is the
     map point of a picked suggestion, or null when the address was typed (typing is always allowed,
     because OpenStreetMap coverage is patchy). Coordinates are saved, never shown. Without a
     MapTiler key it behaves as a plain text field. -->
<script setup lang="ts">
import type { GeoPoint } from '#shared/utils/address'

interface Suggestion {
  id: string
  title: string
  detail: string
  label: string
  point: GeoPoint
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    location?: GeoPoint | null
    label?: string
    hint?: string
    error?: string
    placeholder?: string
    required?: boolean
    disabled?: boolean
    /** Lower-case country code to search in, e.g. "ng". */
    country?: string
    /** Rank suggestions nearest this point (e.g. the restaurant). */
    near?: GeoPoint | null
  }>(),
  { location: null, placeholder: 'Start typing a street, area or landmark', near: null }
)
const emit = defineEmits<{ 'update:modelValue': [value: string]; 'update:location': [value: GeoPoint | null] }>()

const apiKey = useRuntimeConfig().public.maptilerApiKey as string
const uid = useId()

// Places people deliver to; leaves out lagoons, coastlines, regions and whole countries.
const PLACE_TYPES = 'address,road,poi,neighbourhood,locality,place,municipal_district,municipality,postal_code'

const suggestions = ref<Suggestion[]>([])
const open = ref(false)
const active = ref(-1)
const searched = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let latest = 0

async function search(text: string) {
  const id = ++latest
  const params = new URLSearchParams({ key: apiKey, autocomplete: 'true', limit: '5', language: 'en', fuzzyMatch: 'true', types: PLACE_TYPES })
  if (props.country) params.set('country', props.country)
  if (props.near) params.set('proximity', `${props.near.lng},${props.near.lat}`)
  try {
    const res = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(text)}.json?${params}`)
    if (!res.ok) throw new Error(`MapTiler ${res.status}`)
    const body = (await res.json()) as { features?: { id: string; text: string; place_name: string; center: [number, number] }[] }
    if (id !== latest) return // a newer search already started
    suggestions.value = (body.features ?? []).map((f) => ({
      id: f.id,
      title: f.text,
      detail: f.place_name.startsWith(`${f.text}, `) ? f.place_name.slice(f.text.length + 2) : f.place_name === f.text ? '' : f.place_name,
      label: f.place_name,
      point: { lat: f.center[1], lng: f.center[0] }
    }))
  } catch (e) {
    // Suggestions are a convenience: if MapTiler fails, the field keeps working as plain text.
    if (id === latest) suggestions.value = []
    console.warn('[address] suggestions unavailable', e)
  }
  if (id === latest) {
    searched.value = true
    active.value = -1
    open.value = suggestions.value.length > 0
  }
}

function onInput(e: Event) {
  const text = (e.target as HTMLInputElement).value
  emit('update:modelValue', text)
  if (props.location) emit('update:location', null) // edited by hand → no longer the picked point
  clearTimeout(timer)
  searched.value = false
  if (!apiKey || text.trim().length < 3) {
    suggestions.value = []
    open.value = false
    return
  }
  timer = setTimeout(() => search(text.trim()), 300)
}

function pick(s: Suggestion) {
  emit('update:modelValue', s.label)
  emit('update:location', s.point)
  open.value = false
  suggestions.value = []
  searched.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value || !suggestions.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = (active.value + 1) % suggestions.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = active.value <= 0 ? suggestions.value.length - 1 : active.value - 1
  } else if (e.key === 'Enter' && active.value >= 0) {
    e.preventDefault() // pick, don't submit the form
    pick(suggestions.value[active.value]!)
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onBlur() {
  // Let a tap on a suggestion land before the list closes.
  setTimeout(() => (open.value = false), 150)
}

const noMatches = computed(() => searched.value && !suggestions.value.length && props.modelValue.trim().length >= 3 && !props.location)
</script>

<template>
  <div class="relative">
    <label v-if="label" :for="`${uid}-input`" class="mb-1.5 block text-sm font-medium text-ink">{{ label }}</label>
    <div class="relative">
      <Icon name="lucide:map-pin" class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        :id="`${uid}-input`"
        :value="modelValue"
        type="text"
        role="combobox"
        autocomplete="off"
        :aria-expanded="open"
        :aria-controls="`${uid}-list`"
        :aria-activedescendant="active >= 0 ? `${uid}-opt-${active}` : undefined"
        aria-autocomplete="list"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        class="w-full rounded-control border bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
        :class="error ? 'border-error focus:border-error focus:ring-error/15' : 'border-border'"
        @input="onInput"
        @keydown="onKeydown"
        @focus="open = suggestions.length > 0"
        @blur="onBlur"
      />
    </div>

    <ul
      v-if="open"
      :id="`${uid}-list`"
      role="listbox"
      class="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-auto rounded-control border border-border bg-white py-1 shadow-lift"
    >
      <li
        v-for="(s, i) in suggestions"
        :id="`${uid}-opt-${i}`"
        :key="s.id"
        role="option"
        :aria-selected="i === active"
        class="flex cursor-pointer items-start gap-2.5 px-3.5 py-2.5"
        :class="i === active ? 'bg-primary-soft' : 'hover:bg-primary-soft/50'"
        @mousedown.prevent="pick(s)"
        @mouseenter="active = i"
      >
        <Icon name="lucide:map-pin" class="mt-0.5 size-4 shrink-0 text-primary" />
        <span class="min-w-0">
          <span class="block truncate text-sm font-semibold text-ink">{{ s.title }}</span>
          <span v-if="s.detail" class="block truncate text-xs text-muted">{{ s.detail }}</span>
        </span>
      </li>
    </ul>

    <p v-if="error" class="mt-1.5 text-xs font-medium text-error">{{ error }}</p>
    <p v-else-if="location" class="mt-1.5 flex items-center gap-1 text-xs text-success">
      <Icon name="lucide:check" class="size-3.5" />
      Pinned on the map
    </p>
    <p v-else-if="noMatches" class="mt-1.5 text-xs text-muted">Not in the list? That's fine. Just type the full street or area.</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-muted">{{ hint }}</p>
  </div>
</template>
