<script setup lang="ts">
const props = defineProps<{ modelValue: boolean; title?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" @click.self="close">
        <Transition name="modal-pop" appear>
          <div class="w-full max-w-md rounded-t-card bg-surface p-6 shadow-lift sm:rounded-card">
            <div class="mb-4 flex items-start justify-between">
              <h3 class="text-lg font-bold text-ink">{{ title }}</h3>
              <button class="rounded-full p-1 text-muted hover:bg-black/5 hover:text-ink" @click="close">
                <Icon name="lucide:x" class="size-5" />
              </button>
            </div>
            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-pop-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-pop-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
</style>
