<!-- app/pages/menu/[id].vue -->
<script setup lang="ts">
import { drinkChoices } from '#shared/types/models'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id as string

const { data: item, pending, error, refresh } = useAsyncData(`menu-item-${id}`, () => fetchMenuItem(id))
const drinkOptions = computed(() => (item.value ? drinkChoices(item.value) : []))
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
    <NuxtLink to="/menu" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to menu
    </NuxtLink>

    <LoadingState v-if="pending && !item" class="mt-6" :rows="3" />
    <ErrorState v-else-if="error" class="mt-6" message="We couldn't load this combo." @retry="refresh()" />
    <EmptyState v-else-if="!item" class="mt-6" icon="lucide:search-x" title="Combo not found" message="It may no longer be available." />

    <template v-else>
      <div class="mt-6 animate-fade-up overflow-hidden rounded-card border border-border bg-surface shadow-soft">
        <img :src="storagePublicUrl('combo-images', item.image_path) ?? undefined" :alt="item.name" class="aspect-[21/9] w-full bg-primary-soft object-cover" />
        <div class="p-6 sm:p-8">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <BaseBadge tone="primary">{{ item.category }}</BaseBadge>
              <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{{ item.name }}</h1>
              <p class="mt-1 text-sm text-muted">{{ item.short_description }}</p>
            </div>
            <BaseBadge tone="muted">{{ item.currency }}</BaseBadge>
          </div>

          <p class="mt-5 whitespace-pre-line leading-relaxed text-ink">{{ item.description }}</p>

          <div v-if="item.spice_option || drinkOptions.length" class="mt-5 space-y-3 rounded-control border border-border bg-black/[0.02] px-4 py-3.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Your choices at checkout</p>
            <div v-if="item.spice_option" class="flex items-start gap-2 text-sm">
              <Icon name="lucide:flame" class="mt-0.5 size-4 shrink-0 text-warning" />
              <span class="text-ink">Choose <strong>spicy</strong> or <strong>non-spicy</strong>.</span>
            </div>
            <div v-if="drinkOptions.length" class="flex items-start gap-2 text-sm">
              <Icon name="lucide:cup-soda" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span class="text-ink">Pick one drink: <strong>{{ drinkOptions.join(', ') }}</strong>.</span>
            </div>
          </div>

          <div class="mt-6 flex items-center gap-3 rounded-control border border-border bg-black/[0.02] px-4 py-3">
            <Avatar :seed="item.restaurant_name" :src="storagePublicUrl('restaurant-logos', item.restaurant_logo_path)" :size="36" />
            <div class="min-w-0">
              <p class="truncate font-semibold text-ink">{{ item.restaurant_name }}</p>
              <p class="truncate text-xs text-muted">{{ item.restaurant_address }}</p>
            </div>
          </div>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <BaseButton size="lg" block @click="navigateTo(`/checkout/${item.id}`)">
              Order this with my voucher
              <Icon name="lucide:arrow-right" class="size-4" />
            </BaseButton>
          </div>
          <p class="mt-3 text-center text-xs text-muted sm:text-left">
            Your voucher's currency must match this restaurant's ({{ item.currency }}). Prefer to eat in? You can also walk into
            {{ item.restaurant_name }} in person and redeem it there.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
