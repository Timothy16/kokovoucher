<!-- app/pages/admin/restaurants/[id]/menu/[comboId]/edit.vue -->
<script setup lang="ts">
import type { ComboFormValues } from '~/components/admin/ComboForm.vue'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const router = useRouter()
const supabase = useSupabase()
const api = useApi()
const toast = useToast()

const restaurantId = route.params.id as string
const comboId = route.params.comboId as string

const { data, pending, error, refresh } = useAsyncData(`admin-combo-${comboId}`, async () => {
  const [restaurant, combo] = await Promise.all([
    supabase.from('restaurants').select('name').eq('id', restaurantId).maybeSingle(),
    supabase.from('combos').select().eq('id', comboId).eq('restaurant_id', restaurantId).maybeSingle()
  ])
  if (restaurant.error) throw restaurant.error
  if (combo.error) throw combo.error
  return { restaurant: restaurant.data, combo: combo.data }
})

const saving = ref(false)
async function handleSubmit(values: ComboFormValues) {
  const combo = data.value?.combo
  if (!combo) return
  saving.value = true
  let imagePath: string | null = combo.image_path
  try {
    imagePath = await resolveImageField('combo-images', values.image, combo.image_path)
    await api(`/api/admin/combos/${combo.id}`, {
      method: 'PATCH',
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
    toast.success('Combo updated')
    router.push(`/admin/restaurants/${restaurantId}/menu`)
  } catch (e) {
    if (imagePath !== combo.image_path) await discardImage('combo-images', imagePath)
    toast.error('Could not save combo', apiErrorMessage(e))
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

    <LoadingState v-if="pending && !data" :rows="3" />
    <ErrorState v-else-if="error" message="We couldn't load this combo." @retry="refresh()" />
    <EmptyState v-else-if="!data?.restaurant || !data.combo" icon="lucide:search-x" title="Combo not found" message="It may have been removed." />

    <template v-else>
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-ink">Edit combo</h1>
        <p class="text-sm text-muted">{{ data.restaurant.name }} — {{ data.combo.name }}</p>
      </div>

      <BaseCard>
        <ComboForm :initial="data.combo" submit-label="Save changes" :saving="saving" @submit="handleSubmit" />
      </BaseCard>
    </template>
  </div>
</template>
