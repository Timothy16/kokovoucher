<!-- app/pages/admin/restaurants/[id]/menu/create.vue -->
<script setup lang="ts">
import type { ComboFormValues } from '~/components/admin/ComboForm.vue'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const router = useRouter()
const supabase = useSupabase()
const api = useApi()
const toast = useToast()

const restaurantId = route.params.id as string

const { data: restaurant, pending, error, refresh } = useAsyncData(`admin-menu-restaurant-${restaurantId}`, async () => {
  const { data, error } = await supabase.from('restaurants').select('name').eq('id', restaurantId).maybeSingle()
  if (error) throw error
  return data
})

const saving = ref(false)
async function handleSubmit(values: ComboFormValues) {
  saving.value = true
  let imagePath: string | null = null
  try {
    imagePath = await resolveImageField('combo-images', values.image, null)
    await api(`/api/admin/restaurants/${restaurantId}/combos`, {
      method: 'POST',
      body: {
        name: values.name,
        shortDescription: values.shortDescription,
        description: values.description,
        category: values.category,
        imagePath,
        spiceOption: values.spiceOption,
        sodaOptions: values.sodaOptions,
        waterOption: values.waterOption
      }
    })
    toast.success('Combo added')
    router.push(`/admin/restaurants/${restaurantId}/menu`)
  } catch (e) {
    await discardImage('combo-images', imagePath)
    toast.error('Could not add combo', apiErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <NuxtLink :to="`/admin/restaurants/${restaurantId}/menu`" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to menu
    </NuxtLink>

    <LoadingState v-if="pending && !restaurant" :rows="3" />
    <ErrorState v-else-if="error" message="We couldn't load this restaurant." @retry="refresh()" />
    <EmptyState v-else-if="!restaurant" icon="lucide:search-x" title="Restaurant not found" />

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
