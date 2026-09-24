<!-- app/pages/menu/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const { publicMenu } = useMockDb()

const row = computed(() => publicMenu.value.find((r) => r.combo.id === route.params.id))
const drinkOptions = computed(() => (row.value ? [...row.value.combo.sodaOptions, ...(row.value.combo.waterOption ? ['Water'] : [])] : []))
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
    <NuxtLink to="/menu" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to menu
    </NuxtLink>

    <EmptyState v-if="!row" class="mt-6" icon="lucide:search-x" title="Combo not found" message="It may no longer be available." />

    <template v-else>
      <div class="mt-6 animate-fade-up overflow-hidden rounded-card border border-border bg-surface shadow-soft">
        <div class="flex aspect-[21/9] items-center justify-center bg-primary-soft">
          <img v-if="row.combo.imageUrl" :src="row.combo.imageUrl" :alt="row.combo.name" class="size-full object-cover" />
          <Icon v-else name="lucide:utensils-crossed" class="size-14 text-primary/50" />
        </div>
        <div class="p-6 sm:p-8">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <BaseBadge tone="primary">{{ row.combo.category }}</BaseBadge>
              <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{{ row.combo.name }}</h1>
              <p class="mt-1 text-sm text-muted">{{ row.combo.shortDescription }}</p>
            </div>
            <BaseBadge tone="muted">{{ row.restaurant.currency }}</BaseBadge>
          </div>

          <p class="mt-5 leading-relaxed text-ink">{{ row.combo.description }}</p>

          <div v-if="row.combo.spiceOption || drinkOptions.length" class="mt-5 space-y-3 rounded-control border border-border bg-black/[0.02] px-4 py-3.5">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Your choices at checkout</p>
            <div v-if="row.combo.spiceOption" class="flex items-start gap-2 text-sm">
              <Icon name="lucide:flame" class="mt-0.5 size-4 shrink-0 text-warning" />
              <span class="text-ink">Choose <strong>spicy</strong> or <strong>non-spicy</strong>.</span>
            </div>
            <div v-if="drinkOptions.length" class="flex items-start gap-2 text-sm">
              <Icon name="lucide:cup-soda" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span class="text-ink">Pick one drink: <strong>{{ drinkOptions.join(', ') }}</strong>.</span>
            </div>
          </div>

          <div class="mt-6 flex items-center gap-3 rounded-control border border-border bg-black/[0.02] px-4 py-3">
            <Icon name="lucide:store" class="size-5 shrink-0 text-primary" />
            <div class="min-w-0">
              <p class="truncate font-semibold text-ink">{{ row.restaurant.name }}</p>
              <p class="truncate text-xs text-muted">{{ row.restaurant.address }}</p>
            </div>
          </div>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <BaseButton size="lg" block @click="navigateTo(`/checkout/${row.combo.id}`)">
              Order this with my voucher
              <Icon name="lucide:arrow-right" class="size-4" />
            </BaseButton>
          </div>
          <p class="mt-3 text-center text-xs text-muted sm:text-left">
            Your voucher's currency must match this restaurant's ({{ row.restaurant.currency }}). No voucher yet? You can also walk into
            {{ row.restaurant.name }} in person and redeem it there.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
