<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    tone?: 'muted' | 'primary' | 'success' | 'error' | 'warning'
    pulse?: boolean
  }>(),
  { tone: 'muted', pulse: false }
)

const toneClasses: Record<string, string> = {
  muted: 'bg-black/5 text-muted',
  primary: 'bg-primary-soft text-primary-hover',
  success: 'bg-success-soft text-success',
  error: 'bg-error-soft text-error',
  warning: 'bg-warning-soft text-warning'
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="toneClasses[props.tone]"
  >
    <span v-if="pulse" class="size-1.5 rounded-full bg-current animate-pulse-soft" />
    <slot />
  </span>
</template>
