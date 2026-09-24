<!-- app/pages/admin/restaurants/[id]/menu/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const { getRestaurant, combosByRestaurant, toggleComboAvailability } = useMockDb()

const restaurantId = route.params.id as string
const restaurant = computed(() => getRestaurant(restaurantId))
const combos = combosByRestaurant(restaurantId)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <NuxtLink :to="`/admin/restaurants/${restaurantId}`" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to {{ restaurant?.name ?? 'restaurant' }}
    </NuxtLink>

    <EmptyState v-if="!restaurant" icon="lucide:search-x" title="Restaurant not found" message="It may have been removed. Go back and pick another restaurant." />

    <template v-else>
      <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink">Menu — {{ restaurant.name }}</h1>
          <p class="text-sm text-muted">Combos for this restaurant. Availability can also be toggled by the restaurant itself.</p>
        </div>
        <BaseButton @click="navigateTo(`/admin/restaurants/${restaurantId}/menu/create`)">
          <Icon name="lucide:plus" class="size-4" />
          Add combo
        </BaseButton>
      </div>

      <EmptyState v-if="!combos.length" icon="lucide:utensils-crossed" :title="`No combos yet for ${restaurant.name}`" message="This page is working — there's just nothing on the menu yet. Add the first combo below.">
        <BaseButton size="sm" @click="navigateTo(`/admin/restaurants/${restaurantId}/menu/create`)">Add the first combo</BaseButton>
      </EmptyState>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <BaseCard v-for="c in combos" :key="c.id" class="animate-fade-up">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-bold text-ink">{{ c.name }}</p>
              <p class="mt-0.5 text-xs text-muted">{{ c.category }}</p>
            </div>
            <BaseBadge :tone="c.available ? 'success' : 'muted'">{{ c.available ? 'Available' : 'Unavailable' }}</BaseBadge>
          </div>
          <p class="mt-2 text-sm text-muted">{{ c.shortDescription }}</p>
          <div v-if="c.spiceOption || c.sodaOptions.length || c.waterOption" class="mt-3 flex flex-wrap gap-1.5">
            <BaseBadge v-if="c.spiceOption" tone="warning">Spice choice</BaseBadge>
            <BaseBadge v-for="s in c.sodaOptions" :key="s" tone="muted">{{ s }}</BaseBadge>
            <BaseBadge v-if="c.waterOption" tone="muted">Water</BaseBadge>
          </div>
          <div class="mt-4 flex gap-2 border-t border-border pt-4">
            <BaseButton size="sm" variant="secondary" block @click="navigateTo(`/admin/restaurants/${restaurantId}/menu/${c.id}/edit`)">
              <Icon name="lucide:pencil" class="size-3.5" />
              Edit
            </BaseButton>
            <BaseButton size="sm" :variant="c.available ? 'danger' : 'primary'" block @click="toggleComboAvailability(c.id)">
              {{ c.available ? 'Mark unavailable' : 'Mark available' }}
            </BaseButton>
          </div>
        </BaseCard>
      </div>
    </template>
  </div>
</template>
