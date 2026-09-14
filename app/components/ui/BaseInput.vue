<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    modelValue: string | number
    label?: string
    type?: string
    placeholder?: string
    error?: string
    hint?: string
    icon?: string
    required?: boolean
    disabled?: boolean
    autocomplete?: string
  }>(),
  { type: 'text', required: false, disabled: false }
)
defineEmits<{ 'update:modelValue': [value: string] }>()

const revealed = ref(false)
const isPassword = computed(() => props.type === 'password')
const resolvedType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type))
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-ink">{{ label }}</span>
    <div class="relative">
      <Icon v-if="icon" :name="icon" class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        v-bind="$attrs"
        :value="modelValue"
        :type="resolvedType"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        class="w-full rounded-control border bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
        :class="[icon ? 'pl-10' : '', isPassword ? 'pr-10' : '', error ? 'border-error focus:border-error focus:ring-error/15' : 'border-border']"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="isPassword"
        type="button"
        tabindex="-1"
        class="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted transition-colors hover:text-ink"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        @click="revealed = !revealed"
      >
        <Icon :name="revealed ? 'lucide:eye-off' : 'lucide:eye'" class="size-4" />
      </button>
    </div>
    <p v-if="error" class="mt-1.5 text-xs font-medium text-error">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-muted">{{ hint }}</p>
  </label>
</template>
