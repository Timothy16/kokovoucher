<!-- app/pages/admin/restaurants/[id]/menu/[comboId]/edit.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const router = useRouter()
const { db, getRestaurant, updateCombo } = useMockDb()
const toast = useToast()

const restaurantId = route.params.id as string
const restaurant = computed(() => getRestaurant(restaurantId))
const combo = computed(() => db.value.combos.find((c) => c.id === route.params.comboId && c.restaurantId === restaurantId))
const saving = ref(false)

async function handleSubmit(payload: {
  name: string; shortDescription: string; description: string; category: string; imageUrl: string | null
  spiceOption: boolean; sodaOptions: string[]; waterOption: boolean
}) {
  if (!combo.value) return
  saving.value = true
  await new Promise((r) => setTimeout(r, 350))
  updateCombo(combo.value.id, payload)
  saving.value = false
  toast.success('Combo updated')
  router.push(`/admin/restaurants/${restaurantId}/menu`)
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <NuxtLink :to="`/admin/restaurants/${restaurantId}/menu`" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to menu
    </NuxtLink>

    <EmptyState v-if="!restaurant || !combo" icon="lucide:search-x" title="Combo not found" message="It may have been removed." />

    <template v-else>
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-ink">Edit combo</h1>
        <p class="text-sm text-muted">{{ restaurant.name }} — {{ combo.name }}</p>
      </div>

      <BaseCard>
        <ComboForm :initial="combo" submit-label="Save changes" :saving="saving" @submit="handleSubmit" />
      </BaseCard>
    </template>
  </div>
</template>
