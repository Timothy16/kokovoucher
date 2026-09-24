<!-- app/pages/restaurant/menu.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'restaurant', middleware: 'restaurant-auth' })

const { currentRestaurant, combosByRestaurant, toggleComboAvailability } = useMockDb()

const combos = computed(() => (currentRestaurant.value ? combosByRestaurant(currentRestaurant.value.id).value : []))
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Menu</h1>
      <p class="text-sm text-muted">Toggle a combo off when you're out of stock — it disappears from the public menu instantly.</p>
    </div>

    <EmptyState v-if="!combos.length" icon="lucide:utensils-crossed" title="No combos yet" message="Ask KokoVoucher admin to add combos to your menu." />

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <BaseCard v-for="c in combos" :key="c.id" class="animate-fade-up" :class="!c.available ? 'opacity-70' : ''">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-bold text-ink">{{ c.name }}</p>
            <p class="mt-0.5 text-xs text-muted">{{ c.category }}</p>
          </div>
          <BaseBadge :tone="c.available ? 'success' : 'muted'">{{ c.available ? 'Available' : 'Unavailable' }}</BaseBadge>
        </div>
        <p class="mt-2 text-sm text-muted">{{ c.shortDescription }}</p>
        <BaseButton class="mt-4" size="sm" :variant="c.available ? 'danger' : 'primary'" block @click="toggleComboAvailability(c.id)">
          {{ c.available ? 'Mark unavailable' : 'Mark available' }}
        </BaseButton>
      </BaseCard>
    </div>
  </div>
</template>
