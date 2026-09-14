<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    message?: string
  }>(),
  { title: 'Something went wrong', message: 'Please try again.' }
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 text-center animate-fade-in">
    <div class="flex size-14 items-center justify-center rounded-full bg-error-soft">
      <Icon name="lucide:triangle-alert" class="size-6 text-error" />
    </div>
    <div>
      <p class="font-semibold text-ink">{{ title }}</p>
      <p class="mt-1 text-sm text-muted">{{ message }}</p>
    </div>
    <BaseButton variant="secondary" size="sm" @click="$emit('retry')">
      <Icon name="lucide:rotate-cw" class="size-4" />
      Try again
    </BaseButton>
  </div>
</template>
