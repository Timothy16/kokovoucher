<!-- app/components/ui/BaseToggle.vue -->
<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; label: string; hint?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).checked)
}
</script>

<template>
  <label class="flex cursor-pointer items-center justify-between gap-3 rounded-control border border-border bg-white px-3.5 py-3">
    <span class="min-w-0">
      <span class="block text-sm font-medium text-ink">{{ label }}</span>
      <span v-if="hint" class="mt-0.5 block text-xs text-muted">{{ hint }}</span>
    </span>
    <span class="relative inline-flex shrink-0">
      <input type="checkbox" class="peer sr-only" :checked="modelValue" @change="onChange" />
      <span
        class="h-6 w-11 rounded-full bg-black/15 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus-visible:ring-4 peer-focus-visible:ring-primary/25"
      />
    </span>
  </label>
</template>
