<!-- app/components/customer/ComboCard.vue -->
<script setup lang="ts">
import type { Combo, Restaurant } from '~/composables/useMockDb'

const props = defineProps<{ combo: Combo; restaurant: Restaurant }>()
const hasDrinks = computed(() => props.combo.sodaOptions.length > 0 || props.combo.waterOption)
</script>

<template>
  <NuxtLink :to="`/menu/${combo.id}`" class="group block animate-fade-up">
    <BaseCard hover :padded="false" class="overflow-hidden">
      <div class="flex aspect-[16/10] items-center justify-center bg-primary-soft">
        <img v-if="combo.imageUrl" :src="combo.imageUrl" :alt="combo.name" class="size-full object-cover" />
        <Icon v-else name="lucide:utensils-crossed" class="size-10 text-primary/50" />
      </div>
      <div class="p-4">
        <div class="flex items-start justify-between gap-2">
          <p class="font-bold text-ink transition-colors group-hover:text-primary">{{ combo.name }}</p>
          <BaseBadge tone="muted">{{ restaurant.currency }}</BaseBadge>
        </div>
        <p class="mt-1 line-clamp-2 text-sm text-muted">{{ combo.shortDescription }}</p>

        <div v-if="combo.spiceOption || hasDrinks" class="mt-2 flex flex-wrap gap-1.5">
          <span v-if="combo.spiceOption" class="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning" title="Spicy or non-spicy — your choice">
            <Icon name="lucide:flame" class="size-3" />
            Spice choice
          </span>
          <span v-if="hasDrinks" class="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-hover" title="Comes with a drink">
            <Icon name="lucide:cup-soda" class="size-3" />
            Drink included
          </span>
        </div>

        <div class="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
          <span class="inline-flex items-center gap-1.5 font-semibold text-ink">
            <Icon name="lucide:store" class="size-3.5 text-muted" />
            {{ restaurant.name }}
          </span>
          <span class="text-muted">{{ combo.category }}</span>
        </div>
      </div>
    </BaseCard>
  </NuxtLink>
</template>
