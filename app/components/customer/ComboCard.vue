<!-- app/components/customer/ComboCard.vue -->
<script setup lang="ts">
import type { MenuItem } from '#shared/types/models'

const props = defineProps<{ item: MenuItem }>()
const hasDrinks = computed(() => props.item.soda_options.length > 0 || props.item.water_option)
</script>

<template>
  <NuxtLink :to="`/menu/${item.id}`" class="group block animate-fade-up">
    <BaseCard hover :padded="false" class="overflow-hidden">
      <img :src="storagePublicUrl('combo-images', item.image_path) ?? undefined" :alt="item.name" loading="lazy" class="aspect-[16/10] w-full bg-primary-soft object-cover" />
      <div class="p-4">
        <div class="flex items-start justify-between gap-2">
          <p class="font-bold text-ink transition-colors group-hover:text-primary">{{ item.name }}</p>
          <BaseBadge tone="muted">{{ item.currency }}</BaseBadge>
        </div>
        <p class="mt-1 line-clamp-2 text-sm text-muted">{{ item.short_description }}</p>

        <div v-if="item.spice_option || hasDrinks" class="mt-2 flex flex-wrap gap-1.5">
          <span v-if="item.spice_option" class="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning" title="Spicy or non-spicy — your choice">
            <Icon name="lucide:flame" class="size-3" />
            Spice choice
          </span>
          <span v-if="hasDrinks" class="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-hover" title="Comes with a drink">
            <Icon name="lucide:cup-soda" class="size-3" />
            Drink included
          </span>
        </div>

        <div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span class="inline-flex min-w-0 items-center gap-1.5 font-semibold text-ink">
            <Icon name="lucide:store" class="size-3.5 shrink-0 text-muted" />
            <span class="truncate">{{ item.restaurant_name }}</span>
          </span>
          <span class="shrink-0 text-muted">{{ item.category }}</span>
        </div>
      </div>
    </BaseCard>
  </NuxtLink>
</template>
