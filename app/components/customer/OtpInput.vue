<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    length?: number
    modelValue: string
    error?: string
    disabled?: boolean
  }>(),
  { length: 4, disabled: false }
)

const emit = defineEmits<{ 'update:modelValue': [value: string]; complete: [value: string] }>()

const digits = computed(() => {
  const arr = props.modelValue.split('')
  while (arr.length < props.length) arr.push('')
  return arr.slice(0, props.length)
})

const inputs = ref<Array<HTMLInputElement | null>>([])

function commit(next: string[]) {
  const joined = next.join('')
  emit('update:modelValue', joined)
  if (joined.length === props.length && !joined.includes('')) emit('complete', joined)
}

function handleInput(index: number, raw: string) {
  const clean = raw.replace(/\D/g, '')
  const next = [...digits.value]

  if (!clean) {
    next[index] = ''
    commit(next)
    return
  }

  if (clean.length > 1) {
    clean
      .slice(0, props.length - index)
      .split('')
      .forEach((ch, i) => {
        next[index + i] = ch
      })
    commit(next)
    const lastIndex = Math.min(index + clean.length, props.length) - 1
    nextTick(() => inputs.value[lastIndex]?.focus())
    return
  }

  next[index] = clean
  commit(next)
  if (index < props.length - 1) nextTick(() => inputs.value[index + 1]?.focus())
}

function handleKeydown(index: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputs.value[index - 1]?.focus()
  }
}
</script>

<template>
  <div class="flex gap-2" role="group" aria-label="Verification code">
    <input
      v-for="(digit, i) in digits"
      :key="i"
      :ref="(el) => (inputs[i] = el as HTMLInputElement)"
      :value="digit"
      inputmode="numeric"
      autocomplete="one-time-code"
      :maxlength="length"
      :aria-label="`Digit ${i + 1}`"
      :aria-invalid="Boolean(error)"
      :disabled="disabled"
      class="h-14 w-full min-w-0 rounded-xl border bg-white text-center text-xl font-bold text-ink shadow-soft outline-none transition-colors focus:ring-2"
      :class="error ? 'border-error focus:border-error focus:ring-error/15' : 'border-border focus:border-primary focus:ring-primary/15'"
      @input="handleInput(i, ($event.target as HTMLInputElement).value)"
      @keydown="handleKeydown(i, $event)"
    />
  </div>
</template>
