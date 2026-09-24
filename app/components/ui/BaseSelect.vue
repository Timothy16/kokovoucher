<!-- app/components/ui/BaseSelect.vue -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    options: { value: string; label: string }[]
    placeholder?: string
    error?: string
    required?: boolean
  }>(),
  { required: false }
)
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-ink">{{ label }}</span>
    <div class="relative">
      <select
        :value="modelValue"
        :required="required"
        class="w-full appearance-none rounded-control border bg-white px-3.5 py-2.5 pr-9 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
        :class="error ? 'border-error focus:border-error focus:ring-error/15' : 'border-border'"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled selected hidden>{{ placeholder || 'Select…' }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value" :selected="opt.value === modelValue">
          {{ opt.label }}
        </option>
      </select>
      <Icon name="lucide:chevron-down" class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
    <p v-if="error" class="mt-1.5 text-xs font-medium text-error">{{ error }}</p>
  </label>
</template>
