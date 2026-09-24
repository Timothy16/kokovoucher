<!-- app/components/admin/ComboForm.vue -->
<script setup lang="ts">
import type { Combo } from '~/composables/useMockDb'

const props = defineProps<{ initial?: Combo | null; submitLabel: string; saving?: boolean }>()
const emit = defineEmits<{
  submit: [payload: {
    name: string; shortDescription: string; description: string; category: string; imageUrl: string | null
    spiceOption: boolean; sodaOptions: string[]; waterOption: boolean
  }]
}>()

const categoryOptions = [
  { value: 'Combos', label: 'Combos' },
  { value: 'Family Meals', label: 'Family Meals' },
  { value: 'Lunch Deals', label: 'Lunch Deals' }
]

const form = reactive({
  name: props.initial?.name ?? '',
  shortDescription: props.initial?.shortDescription ?? '',
  description: props.initial?.description ?? '',
  category: props.initial?.category ?? '',
  imageUrl: props.initial?.imageUrl ?? (null as string | null),
  spiceOption: props.initial?.spiceOption ?? false,
  sodaOptions: props.initial ? [...props.initial.sodaOptions] : ([] as string[]),
  waterOption: props.initial?.waterOption ?? false
})
const newSoda = ref('')
const errors = reactive<Record<string, string>>({})

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

function handleSubmit() {
  if (!validate()) return
  emit('submit', {
    name: form.name, shortDescription: form.shortDescription, description: form.description, category: form.category, imageUrl: form.imageUrl,
    spiceOption: form.spiceOption, sodaOptions: form.sodaOptions, waterOption: form.waterOption
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
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

    <BaseButton type="submit" block :loading="saving">{{ submitLabel }}</BaseButton>
  </form>
</template>
