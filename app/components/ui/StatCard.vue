<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon: string
  tone?: 'primary' | 'success' | 'error' | 'warning' | 'muted'
}>()
</script>

<template>
  <BaseCard hover class="animate-fade-up">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-muted">{{ label }}</p>
        <p class="mt-1 text-2xl font-extrabold tracking-tight text-ink">{{ value }}</p>
      </div>
      <div
        class="flex size-11 items-center justify-center rounded-full"
        :class="{
          'bg-primary-soft text-primary': !tone || tone === 'primary',
          'bg-success-soft text-success': tone === 'success',
          'bg-error-soft text-error': tone === 'error',
          'bg-warning-soft text-warning': tone === 'warning',
          'bg-black/5 text-muted': tone === 'muted'
        }"
      >
        <Icon :name="icon" class="size-5" />
      </div>
    </div>
  </BaseCard>
</template>
