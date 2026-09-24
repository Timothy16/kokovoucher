<!-- app/components/ui/BaseToggle.vue -->
<script setup lang="ts">
defineProps<{ modelValue: boolean; label: string; hint?: string }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="flex cursor-pointer items-center justify-between gap-3 rounded-control border border-border bg-white px-3.5 py-3">
    <span class="min-w-0">
      <span class="block text-sm font-medium text-ink">{{ label }}</span>
      <span v-if="hint" class="mt-0.5 block text-xs text-muted">{{ hint }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      :class="modelValue ? 'bg-primary' : 'bg-black/15'"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span class="inline-block size-4.5 transform rounded-full bg-white shadow-sm transition-transform" :class="modelValue ? 'translate-x-6' : 'translate-x-1'" />
    </button>
  </label>
</template>
