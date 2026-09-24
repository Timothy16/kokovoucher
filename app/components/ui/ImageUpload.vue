<!-- app/components/ui/ImageUpload.vue -->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string | null
    label?: string
    required?: boolean
    error?: string
    maxSizeMb?: number
  }>(),
  { required: false, maxSizeMb: 2 }
)
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const localError = ref('')

function pick() {
  fileInput.value?.click()
}

function onSelect(e: Event) {
  localError.value = ''
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    localError.value = 'Please choose an image file.'
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    localError.value = `Image is too large — keep it under ${props.maxSizeMb}MB.`
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => emit('update:modelValue', reader.result as string)
  reader.onerror = () => {
    localError.value = "Couldn't read that image — try another file."
  }
  reader.readAsDataURL(file)
}

function remove() {
  emit('update:modelValue', null)
  if (fileInput.value) fileInput.value.value = ''
}

const shownError = computed(() => props.error || localError.value)
</script>

<template>
  <div>
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-ink">
      {{ label }}
      <span v-if="required" class="text-error">*</span>
    </span>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onSelect" />

    <div v-if="modelValue" class="flex items-center gap-3 rounded-control border border-border bg-white p-2.5">
      <img :src="modelValue" alt="Combo preview" class="size-16 shrink-0 rounded-control object-cover" />
      <div class="min-w-0 flex-1 text-sm">
        <p class="font-medium text-ink">Image selected</p>
        <button type="button" class="text-xs font-semibold text-primary" @click="pick">Replace</button>
      </div>
      <button type="button" class="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-black/5 hover:text-error" aria-label="Remove image" @click="remove">
        <Icon name="lucide:x" class="size-4" />
      </button>
    </div>

    <button
      v-else
      type="button"
      class="flex w-full flex-col items-center justify-center gap-2 rounded-control border border-dashed px-4 py-6 text-center transition-colors hover:bg-primary-soft/40"
      :class="shownError ? 'border-error' : 'border-primary/40'"
      @click="pick"
    >
      <Icon name="lucide:image-plus" class="size-6 text-primary" />
      <span class="text-sm font-semibold text-primary-hover">Upload a photo</span>
      <span class="text-xs text-muted">JPG or PNG, up to {{ maxSizeMb }}MB</span>
    </button>

    <p v-if="shownError" class="mt-1.5 text-xs font-medium text-error">{{ shownError }}</p>
  </div>
</template>
