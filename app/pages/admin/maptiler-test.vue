<!-- app/pages/admin/maptiler-test.vue -->
<!-- Diagnostics: is the MapTiler key working from the browser, and how good are the address
     suggestions for our markets? Calls MapTiler's geocoding API directly, exactly as the real
     address field will. Admin only, not in the menu. -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Feature {
  id: string
  place_name: string
  place_type: string[]
  center: [number, number]
}

const config = useRuntimeConfig()
const apiKey = config.public.maptilerApiKey as string

const countryOptions = [
  { value: 'ng', label: 'Nigeria' },
  { value: 'ke', label: 'Kenya' },
  { value: 'us', label: 'United States' },
  { value: '', label: 'Any country' }
]
const country = ref('ng')
const query = ref('')
const loading = ref(false)
const requestCount = ref(0)
const result = ref<{ ok: boolean; httpStatus: number | null; ms: number; response: unknown } | null>(null)
const suggestions = ref<Feature[]>([])
const picked = ref<Feature | null>(null)

let timer: ReturnType<typeof setTimeout> | undefined
let latest = 0

async function search(text: string) {
  const id = ++latest
  loading.value = true
  requestCount.value++
  const params = new URLSearchParams({ key: apiKey, autocomplete: 'true', limit: '5', language: 'en', fuzzyMatch: 'true' })
  if (country.value) params.set('country', country.value)
  const started = performance.now()
  try {
    const res = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(text)}.json?${params}`)
    const body = await res.json().catch(() => res.statusText)
    if (id !== latest) return // a newer search already started
    result.value = { ok: res.ok, httpStatus: res.status, ms: Math.round(performance.now() - started), response: body }
    suggestions.value = res.ok ? ((body as { features?: Feature[] }).features ?? []) : []
  } catch (e) {
    if (id !== latest) return
    result.value = { ok: false, httpStatus: null, ms: Math.round(performance.now() - started), response: e instanceof Error ? e.message : String(e) }
    suggestions.value = []
  } finally {
    if (id === latest) loading.value = false
  }
}

// Same behaviour the real field will have: wait for 3 letters and a short pause in typing.
watch([query, country], ([text]) => {
  picked.value = null
  clearTimeout(timer)
  if (!apiKey || text.trim().length < 3) {
    suggestions.value = []
    return
  }
  timer = setTimeout(() => search(text.trim()), 300)
})

const mapsLink = (f: Feature) => `https://www.google.com/maps/search/?api=1&query=${f.center[1]},${f.center[0]}`
const pretty = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value, null, 2))
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">MapTiler test</h1>
      <p class="text-sm text-muted">Type an address to check the MapTiler key works from the browser and to see how good the suggestions are. Nothing here is saved.</p>
    </div>

    <BaseCard v-if="!apiKey" class="animate-fade-up">
      <p class="flex items-start gap-2 text-sm font-medium text-error">
        <Icon name="lucide:circle-alert" class="mt-0.5 size-4 shrink-0" />
        <span><code>NUXT_PUBLIC_MAPTILER_API_KEY</code> isn't set for this environment. Add it to <code>.env</code> (or Vercel) and restart.</span>
      </p>
    </BaseCard>

    <BaseCard v-else class="animate-fade-up space-y-4">
      <div class="flex items-center gap-2">
        <Icon name="lucide:map-pin" class="size-5 text-primary" />
        <h2 class="font-bold text-ink">Address search</h2>
      </div>
      <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <BaseInput v-model="query" label="Address" icon="lucide:search" placeholder="e.g. Admiralty Way, Lekki" autocomplete="off" />
        <BaseSelect v-model="country" label="Search in" :options="countryOptions" />
      </div>
      <p class="text-xs text-muted">Searches after 3 letters and a short pause in typing. Requests sent this visit: <span class="font-semibold text-ink">{{ requestCount }}</span></p>

      <div v-if="loading" class="text-sm text-muted">Searching…</div>
      <ul v-else-if="suggestions.length" class="divide-y divide-border overflow-hidden rounded-control border border-border">
        <li v-for="f in suggestions" :key="f.id">
          <button type="button" class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-soft/50" :class="picked?.id === f.id ? 'bg-primary-soft' : ''" @click="picked = f">
            <Icon name="lucide:map-pin" class="mt-0.5 size-4 shrink-0 text-primary" />
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-ink">{{ f.place_name }}</span>
              <span class="block text-xs text-muted">{{ f.place_type.join(', ') }} · {{ f.center[1].toFixed(5) }}, {{ f.center[0].toFixed(5) }}</span>
            </span>
          </button>
        </li>
      </ul>
      <p v-else-if="result?.ok && query.trim().length >= 3" class="text-sm text-muted">No suggestions for that. In the real field, people can still type it themselves.</p>

      <div v-if="picked" class="rounded-control border border-success/30 bg-success-soft px-4 py-3 text-sm">
        <p class="font-semibold text-ink">Picked: {{ picked.place_name }}</p>
        <p class="mt-0.5 text-xs text-muted">Saved location would be {{ picked.center[1].toFixed(6) }}, {{ picked.center[0].toFixed(6) }}</p>
        <a :href="mapsLink(picked)" target="_blank" rel="noopener" class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          Open in Maps
          <Icon name="lucide:external-link" class="size-3.5" />
        </a>
      </div>

      <div v-if="result" class="space-y-2">
        <BaseBadge :tone="result.ok ? 'success' : 'error'">{{ result.ok ? 'Key works' : 'Failed' }} · HTTP {{ result.httpStatus ?? '—' }} · {{ result.ms }} ms</BaseBadge>
        <p v-if="result.httpStatus === 403" class="text-xs font-medium text-error">403 usually means the key isn't allowed from this address. Check the key's allowed origins in the MapTiler dashboard.</p>
        <details>
          <summary class="cursor-pointer text-xs font-semibold text-muted">Raw response from MapTiler</summary>
          <pre class="mt-2 max-h-80 overflow-auto rounded-control bg-ink/5 p-3 text-xs text-ink">{{ pretty(result.response) }}</pre>
        </details>
      </div>
    </BaseCard>
  </div>
</template>
