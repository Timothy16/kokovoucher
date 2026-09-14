<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title?: string
    message?: string
  }>(),
  { icon: 'lucide:inbox', title: 'Nothing here yet', message: '' }
)
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 text-center animate-fade-in">
    <div class="flex size-14 items-center justify-center rounded-full bg-primary-soft">
      <Icon :name="icon" class="size-6 text-primary" />
    </div>
    <div>
      <p class="font-semibold text-ink">{{ title }}</p>
      <p v-if="message" class="mt-1 text-sm text-muted">{{ message }}</p>
    </div>
    <slot />
  </div>
</template>
