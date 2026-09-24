<!-- app/pages/admin/restaurants/[id]/menu/create.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const router = useRouter()
const { getRestaurant, createCombo } = useMockDb()
const toast = useToast()

const restaurantId = route.params.id as string
const restaurant = computed(() => getRestaurant(restaurantId))
const saving = ref(false)

async function handleSubmit(payload: {
  name: string; shortDescription: string; description: string; category: string; imageUrl: string | null
  spiceOption: boolean; sodaOptions: string[]; waterOption: boolean
}) {
  saving.value = true
  await new Promise((r) => setTimeout(r, 350))
  createCombo({ restaurantId, ...payload })
  saving.value = false
  toast.success('Combo added')
  router.push(`/admin/restaurants/${restaurantId}/menu`)
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <NuxtLink :to="`/admin/restaurants/${restaurantId}/menu`" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to menu
    </NuxtLink>

    <EmptyState v-if="!restaurant" icon="lucide:search-x" title="Restaurant not found" />

    <template v-else>
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-ink">Add combo</h1>
        <p class="text-sm text-muted">For {{ restaurant.name }}.</p>
      </div>

      <BaseCard>
        <ComboForm submit-label="Add combo" :saving="saving" @submit="handleSubmit" />
      </BaseCard>
    </template>
  </div>
</template>
