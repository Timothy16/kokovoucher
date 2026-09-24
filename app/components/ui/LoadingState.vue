<!-- app/components/ui/LoadingState.vue -->
<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 4 })
</script>

<template>
  <div class="space-y-3">
    <div v-for="i in rows" :key="i" class="skeleton h-14 animate-shimmer rounded-control" />
  </div>
</template>
