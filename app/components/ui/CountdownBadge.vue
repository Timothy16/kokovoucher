<!-- app/components/ui/CountdownBadge.vue -->
<script setup lang="ts">
const props = defineProps<{ expiresAt: string }>()
const { label, isExpired, isUrgent } = useCountdown(computed(() => props.expiresAt))
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
    :class="isExpired ? 'bg-error-soft text-error' : isUrgent ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary-hover'"
  >
    <Icon name="lucide:clock" class="size-3.5" />
    {{ isExpired ? 'Expired' : label }}
  </span>
</template>
