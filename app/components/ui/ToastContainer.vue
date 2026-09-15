<script setup lang="ts">
const { toasts, dismiss } = useToast()

const icon: Record<ToastType, string> = {
  success: 'lucide:circle-check',
  error: 'lucide:circle-x',
  warning: 'lucide:triangle-alert',
  info: 'lucide:info'
}
const tone: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-primary'
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-lift animate-toast-in"
      >
        <Icon :name="icon[t.type]" class="mt-0.5 size-5 shrink-0" :class="tone[t.type]" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink">{{ t.title }}</p>
          <p v-if="t.message" class="mt-0.5 text-xs text-muted">{{ t.message }}</p>
        </div>
        <button class="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-black/5 hover:text-ink" @click="dismiss(t.id)">
          <Icon name="lucide:x" class="size-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.97);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(12px) scale(0.97);
}
.toast-move {
  transition: transform 0.25s ease;
}
</style>
