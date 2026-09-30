<!-- app/pages/restaurant/menu.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const supabase = useSupabase()
const api = useApi()
const toast = useToast()

// RLS returns only this restaurant's combos.
const { data: combos, pending, error, refresh } = useAsyncData('restaurant-menu', async () => {
  const { data, error } = await supabase.from('combos').select().order('created_at', { ascending: false })
  if (error) throw error
  return data
})

const toggling = ref<string | null>(null)
async function toggle(id: string, available: boolean) {
  if (toggling.value) return
  toggling.value = id
  try {
    await api(`/api/combos/${id}/availability`, { method: 'PATCH', body: { available } })
    const combo = combos.value?.find((c) => c.id === id)
    if (combo) combo.available = available
    toast.success(available ? 'Back on the menu' : 'Marked unavailable', available ? 'Customers can order it again.' : 'Hidden from the public menu.')
  } catch (e) {
    toast.error('Could not update availability', apiErrorMessage(e))
  } finally {
    toggling.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Menu</h1>
      <p class="text-sm text-muted">Toggle a combo off when you're out of stock — it disappears from the public menu instantly.</p>
    </div>

    <LoadingState v-if="pending && !combos" :rows="3" />
    <ErrorState v-else-if="error" message="We couldn't load your menu." @retry="refresh()" />
    <EmptyState v-else-if="!combos?.length" icon="lucide:utensils-crossed" title="No combos yet" message="Ask KokoSend admin to add combos to your menu." />

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <BaseCard v-for="c in combos" :key="c.id" :padded="false" class="animate-fade-up overflow-hidden" :class="!c.available ? 'opacity-70' : ''">
        <img :src="storagePublicUrl('combo-images', c.image_path) ?? undefined" :alt="c.name" class="aspect-[16/9] w-full bg-primary-soft object-cover" />
        <div class="p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-bold text-ink">{{ c.name }}</p>
              <p class="mt-0.5 text-xs text-muted">{{ c.category }}</p>
            </div>
            <BaseBadge :tone="c.available ? 'success' : 'muted'">{{ c.available ? 'Available' : 'Unavailable' }}</BaseBadge>
          </div>
          <p class="mt-2 text-sm text-muted">{{ c.short_description }}</p>
          <BaseButton class="mt-4" size="sm" :variant="c.available ? 'danger' : 'primary'" block :loading="toggling === c.id" @click="toggle(c.id, !c.available)">
            {{ c.available ? 'Mark unavailable' : 'Mark available' }}
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
