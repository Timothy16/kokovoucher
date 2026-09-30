<!-- app/pages/admin/restaurants/[id]/menu/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const supabase = useSupabase()
const api = useApi()
const toast = useToast()

const restaurantId = route.params.id as string

const { data, pending, error, refresh } = useAsyncData(`admin-menu-${restaurantId}`, async () => {
  const [restaurant, combos] = await Promise.all([
    supabase.from('restaurants').select('id, name, status').eq('id', restaurantId).maybeSingle(),
    supabase.from('combos').select().eq('restaurant_id', restaurantId).order('created_at', { ascending: false })
  ])
  if (restaurant.error) throw restaurant.error
  if (combos.error) throw combos.error
  return { restaurant: restaurant.data, combos: combos.data }
})
const restaurant = computed(() => data.value?.restaurant ?? null)

const toggling = ref<string | null>(null)
async function toggle(id: string, available: boolean) {
  if (toggling.value) return
  toggling.value = id
  try {
    await api(`/api/combos/${id}/availability`, { method: 'PATCH', body: { available } })
    const combo = data.value?.combos.find((c) => c.id === id)
    if (combo) combo.available = available
  } catch (e) {
    toast.error('Could not update availability', apiErrorMessage(e))
  } finally {
    toggling.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <NuxtLink :to="`/admin/restaurants/${restaurantId}`" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to {{ restaurant?.name ?? 'restaurant' }}
    </NuxtLink>

    <LoadingState v-if="pending && !data" :rows="3" />
    <ErrorState v-else-if="error" message="We couldn't load this menu." @retry="refresh()" />
    <EmptyState v-else-if="!restaurant" icon="lucide:search-x" title="Restaurant not found" message="Go back and pick another restaurant." />

    <template v-else-if="data">
      <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink">Menu — {{ restaurant.name }}</h1>
          <p class="text-sm text-muted">
            Combos for this restaurant. Availability can also be toggled by the restaurant itself.
            <template v-if="restaurant.status !== 'active'"> Nothing shows on the public menu until the restaurant is active.</template>
          </p>
        </div>
        <BaseButton @click="navigateTo(`/admin/restaurants/${restaurantId}/menu/create`)">
          <Icon name="lucide:plus" class="size-4" />
          Add combo
        </BaseButton>
      </div>

      <EmptyState v-if="!data.combos.length" icon="lucide:utensils-crossed" :title="`No combos yet for ${restaurant.name}`" message="Add the first combo to put this restaurant on the menu.">
        <BaseButton size="sm" @click="navigateTo(`/admin/restaurants/${restaurantId}/menu/create`)">Add the first combo</BaseButton>
      </EmptyState>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <BaseCard v-for="c in data.combos" :key="c.id" :padded="false" class="animate-fade-up overflow-hidden">
          <img :src="storagePublicUrl('combo-images', c.image_path) ?? undefined" :alt="c.name" class="aspect-[16/9] w-full bg-primary-soft object-cover" :class="!c.available ? 'opacity-60' : ''" />
          <div class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-bold text-ink">{{ c.name }}</p>
                <p class="mt-0.5 text-xs text-muted">{{ c.category }}</p>
              </div>
              <BaseBadge :tone="c.available ? 'success' : 'muted'">{{ c.available ? 'Available' : 'Unavailable' }}</BaseBadge>
            </div>
            <p class="mt-2 text-sm text-muted">{{ c.short_description }}</p>
            <div v-if="c.spice_option || c.soda_options.length || c.water_option" class="mt-3 flex flex-wrap gap-1.5">
              <BaseBadge v-if="c.spice_option" tone="warning">Spice choice</BaseBadge>
              <BaseBadge v-for="s in c.soda_options" :key="s" tone="muted">{{ s }}</BaseBadge>
              <BaseBadge v-if="c.water_option" tone="muted">Water</BaseBadge>
            </div>
            <div class="mt-4 flex gap-2 border-t border-border pt-4">
              <BaseButton size="sm" variant="secondary" block @click="navigateTo(`/admin/restaurants/${restaurantId}/menu/${c.id}/edit`)">
                <Icon name="lucide:pencil" class="size-3.5" />
                Edit
              </BaseButton>
              <BaseButton size="sm" :variant="c.available ? 'danger' : 'primary'" block :loading="toggling === c.id" @click="toggle(c.id, !c.available)">
                {{ c.available ? 'Mark unavailable' : 'Mark available' }}
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    </template>
  </div>
</template>
