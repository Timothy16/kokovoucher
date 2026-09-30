<!-- app/components/admin/ComboForm.vue -->
<!-- Shared by Add combo and Edit combo. Emits plain values; the page uploads the photo
     (`image` is a data URL when newly picked, else the existing photo's URL). -->
<script setup lang="ts">
import { COMBO_CATEGORIES, MAX_SODA_OPTIONS, type Combo } from '#shared/types/models'

export interface ComboFormValues {
  name: string
  shortDescription: string
  description: string
  category: string
  image: string | null
  spiceOption: boolean
  sodaOptions: string[]
  waterOption: boolean
}

const props = defineProps<{ initial?: Combo | null; submitLabel: string; saving?: boolean }>()
const emit = defineEmits<{ submit: [values: ComboFormValues] }>()

const categoryOptions = COMBO_CATEGORIES.map((c) => ({ value: c, label: c }))

const form = reactive<ComboFormValues>({
  name: props.initial?.name ?? '',
  shortDescription: props.initial?.short_description ?? '',
  description: props.initial?.description ?? '',
  category: props.initial?.category ?? '',
  image: props.initial ? storagePublicUrl('combo-images', props.initial.image_path) : null,
  spiceOption: props.initial?.spice_option ?? false,
  sodaOptions: props.initial ? [...props.initial.soda_options] : [],
  waterOption: props.initial?.water_option ?? false
})
const newSoda = ref('')
const errors = reactive<Record<string, string>>({})

function addSoda() {
  delete errors.sodaOptions
  const name = newSoda.value.trim()
  if (!name) return
  if (name.toLowerCase() === 'water') {
    errors.sodaOptions = 'Use the “Water available” toggle for water.'
    return
  }
  if (form.sodaOptions.some((s) => s.toLowerCase() === name.toLowerCase())) {
    errors.sodaOptions = `${name} is already listed.`
    return
  }
  if (form.sodaOptions.length >= MAX_SODA_OPTIONS) {
    errors.sodaOptions = `Up to ${MAX_SODA_OPTIONS} soda options.`
    return
  }
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
  if (!form.category) errors.category = 'Pick a category.'
  if (!form.image) errors.image = 'Upload a photo for this combo.'
  if (!form.description.trim()) errors.description = 'Enter a full description.'
  return Object.keys(errors).length === 0
}

function handleSubmit() {
  if (props.saving || !validate()) return
  emit('submit', { ...form, sodaOptions: [...form.sodaOptions] })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <BaseInput v-model="form.name" label="Combo name" placeholder="Family Feast" :error="errors.name" required />
    <BaseInput v-model="form.shortDescription" label="Short description" placeholder="2 burgers, fries and 2 drinks" :error="errors.shortDescription" required />
    <BaseSelect v-model="form.category" label="Category" :options="categoryOptions" placeholder="Select" :error="errors.category" required />
    <ImageUpload v-model="form.image" label="Food photo" required :error="errors.image" />
    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-ink">Description</span>
      <textarea
        v-model="form.description"
        rows="3"
        maxlength="1000"
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
            maxlength="40"
            class="min-w-0 flex-1 rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            @keydown.enter.prevent="addSoda"
          />
          <BaseButton type="button" variant="secondary" @click="addSoda">Add</BaseButton>
        </div>
        <p v-if="errors.sodaOptions" class="mt-1.5 text-xs font-medium text-error">{{ errors.sodaOptions }}</p>
        <div v-if="form.sodaOptions.length" class="mt-2 flex flex-wrap gap-1.5">
          <span v-for="s in form.sodaOptions" :key="s" class="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
            {{ s }}
            <button type="button" :aria-label="`Remove ${s}`" @click="removeSoda(s)"><Icon name="lucide:x" class="size-3" /></button>
          </span>
        </div>
      </div>

      <BaseToggle v-model="form.waterOption" label="Water available" hint="Adds water as a drink choice alongside any sodas above." />
    </div>

    <BaseButton type="submit" block :loading="saving">{{ submitLabel }}</BaseButton>
  </form>
</template>
