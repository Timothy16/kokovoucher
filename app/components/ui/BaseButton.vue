<!-- app/components/ui/BaseButton.vue -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    type: 'button',
    block: false
  }
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :class="[
      block ? 'w-full' : '',
      size === 'sm' ? 'px-3.5 py-2 text-sm' : size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-5 py-2.5 text-sm',
      variant === 'primary' && 'bg-primary text-white shadow-soft hover:bg-primary-hover hover:shadow-lift',
      variant === 'secondary' && 'bg-white text-ink border border-border hover:border-primary/40 hover:bg-primary-soft',
      variant === 'ghost' && 'bg-transparent text-ink hover:bg-black/5',
      variant === 'danger' && 'bg-error text-white hover:bg-error/90 shadow-soft'
    ]"
  >
    <Icon v-if="loading" name="lucide:loader-circle" class="size-4 animate-spin" />
    <slot />
  </button>
</template>
