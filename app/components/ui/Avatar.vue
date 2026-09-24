<!-- app/components/ui/Avatar.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{ seed: string; size?: number }>(), { size: 40 })
const errored = ref(false)
const src = computed(() => `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(props.seed)}&backgroundColor=e9f3ef`)
const initials = computed(() =>
  props.seed
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
)
</script>

<template>
  <img
    v-if="!errored"
    :src="src"
    :width="size"
    :height="size"
    class="shrink-0 rounded-full border border-border bg-primary-soft"
    :style="{ width: `${size}px`, height: `${size}px` }"
    alt=""
    @error="errored = true"
  />
  <div
    v-else
    class="flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-hover"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.4}px` }"
  >
    {{ initials }}
  </div>
</template>
