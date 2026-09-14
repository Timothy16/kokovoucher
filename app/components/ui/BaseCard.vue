<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean; hover?: boolean }>(), { padded: true, hover: false })
</script>

<template>
  <div
    class="rounded-card border border-border bg-surface shadow-soft transition-all duration-200"
    :class="[padded ? 'p-5 sm:p-6' : '', hover ? 'hover:-translate-y-0.5 hover:shadow-lift' : '']"
  >
    <slot />
  </div>
</template>
