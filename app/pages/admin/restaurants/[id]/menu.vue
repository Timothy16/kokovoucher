<!-- app/pages/admin/restaurants/[id]/menu.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

import type { Combo } from '~/composables/useMockDb'

const route = useRoute()
const { getRestaurant, combosByRestaurant, createCombo, updateCombo, toggleComboAvailability } = useMockDb()
const toast = useToast()

const restaurantId = route.params.id as string
const restaurant = computed(() => getRestaurant(restaurantId))
const combos = combosByRestaurant(restaurantId)

const categoryOptions = [
  { value: 'Combos', label: 'Combos' },
  { value: 'Family Meals', label: 'Family Meals' },
  { value: 'Lunch Deals', label: 'Lunch Deals' }
]

const modalOpen = ref(false)
const editing = ref<Combo | null>(null)
const form = reactive({
  name: '', shortDescription: '', description: '', category: '', imageUrl: null as string | null,
  spiceOption: false, sodaOptions: [] as string[], waterOption: false
})
const newSoda = ref('')
const errors = reactive<Record<string, string>>({})
const saving = ref(false)

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', shortDescription: '', description: '', category: '', imageUrl: null, spiceOption: false, sodaOptions: [], waterOption: false })
  newSoda.value = ''
  Object.keys(errors).forEach((k) => delete errors[k])
  modalOpen.value = true
}
function openEdit(c: Combo) {
  editing.value = c
  Object.assign(form, {
    name: c.name, shortDescription: c.shortDescription, description: c.description, category: c.category, imageUrl: c.imageUrl,
    spiceOption: c.spiceOption, sodaOptions: [...c.sodaOptions], waterOption: c.waterOption
  })
  newSoda.value = ''
  Object.keys(errors).forEach((k) => delete errors[k])
  modalOpen.value = true
}

function addSoda() {
  const name = newSoda.value.trim()
  if (!name || form.sodaOptions.some((s) => s.toLowerCase() === name.toLowerCase())) return
  form.sodaOptions.push(name)
  newSoda.value = ''
}
function removeSoda(name: string) {
  form.sodaOptions = form.sodaOptions.filter((s) => s !== name)
}

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name.trim()) errors.name = 'Enter a combo name.'
  if (!form.shortDescription.trim()) errors.shortDescription = 'Enter a short description.'
  if (!form.category.trim()) errors.category = 'Pick a category.'
  if (!form.imageUrl) errors.imageUrl = 'Upload a photo for this combo.'
  if (!form.description.trim()) errors.description = 'Enter a full description.'
  return Object.keys(errors).length === 0
}

async function save() {
  if (!validate()) return
  saving.value = true
  await new Promise((r) => setTimeout(r, 350))
  const payload = {
    name: form.name, shortDescription: form.shortDescription, description: form.description, category: form.category, imageUrl: form.imageUrl,
    spiceOption: form.spiceOption, sodaOptions: form.sodaOptions, waterOption: form.waterOption
  }
  if (editing.value) {
    updateCombo(editing.value.id, payload)
    toast.success('Combo updated')
  } else {
    createCombo({ restaurantId, ...payload })
    toast.success('Combo added')
  }
  saving.value = false
  modalOpen.value = false
}
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
        <BaseButton @click="openCreate">
          <Icon name="lucide:plus" class="size-4" />
          Add combo
        </BaseButton>
      </div>

      <EmptyState v-if="!combos.length" icon="lucide:utensils-crossed" :title="`No combos yet for ${restaurant.name}`" message="This page is working — there's just nothing on the menu yet. Add the first combo below.">
        <BaseButton size="sm" @click="openCreate">Add the first combo</BaseButton>
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
            <BaseButton size="sm" variant="secondary" block @click="openEdit(c)">
              <Icon name="lucide:pencil" class="size-3.5" />
              Edit
            </BaseButton>
            <BaseButton size="sm" :variant="c.available ? 'danger' : 'primary'" block @click="toggleComboAvailability(c.id)">
              {{ c.available ? 'Mark unavailable' : 'Mark available' }}
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <BaseModal v-model="modalOpen" :title="editing ? 'Edit combo' : 'Add combo'">
        <form class="space-y-4" @submit.prevent="save">
          <BaseInput v-model="form.name" label="Combo name" placeholder="Family Feast" :error="errors.name" required />
          <BaseInput v-model="form.shortDescription" label="Short description" placeholder="2 burgers, fries and 2 drinks" :error="errors.shortDescription" required />
          <BaseSelect v-model="form.category" label="Category" :options="categoryOptions" placeholder="Select" :error="errors.category" required />
          <ImageUpload v-model="form.imageUrl" label="Food photo" required :error="errors.imageUrl" />
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-ink">Description</span>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full rounded-control border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              :class="errors.description ? 'border-error' : 'border-border'"
            />
            <p v-if="errors.description" class="mt-1.5 text-xs font-medium text-error">{{ errors.description }}</p>
          </label>

          <div class="space-y-3 border-t border-border pt-4">
            <p class="text-sm font-bold text-ink">Options customers choose at checkout</p>
            <BaseToggle v-model="form.spiceOption" label="Spice choice" hint="Customer picks spicy or non-spicy." />

            <div>
              <span class="mb-1.5 block text-sm font-medium text-ink">Soda options</span>
              <div class="flex gap-2">
                <input
                  v-model="newSoda"
                  placeholder="e.g. Coca-Cola"
                  class="flex-1 rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  @keydown.enter.prevent="addSoda"
                />
                <BaseButton type="button" variant="secondary" @click="addSoda">Add</BaseButton>
              </div>
              <div v-if="form.sodaOptions.length" class="mt-2 flex flex-wrap gap-1.5">
                <span v-for="s in form.sodaOptions" :key="s" class="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
                  {{ s }}
                  <button type="button" aria-label="Remove" @click="removeSoda(s)"><Icon name="lucide:x" class="size-3" /></button>
                </span>
              </div>
            </div>

            <BaseToggle v-model="form.waterOption" label="Water available" hint="Adds water as a drink choice alongside any sodas above." />
          </div>

          <BaseButton type="submit" block :loading="saving">{{ editing ? 'Save changes' : 'Add combo' }}</BaseButton>
        </form>
      </BaseModal>
    </template>
  </div>
</template>
