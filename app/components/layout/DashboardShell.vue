<script setup lang="ts">
const props = defineProps<{
  brand: string
  navItems: { to: string; label: string; icon: string }[]
  identityLabel: string
  identitySub?: string
  badge?: { tone: 'warning' | 'success' | 'muted'; label: string }
}>()
const emit = defineEmits<{ logout: [] }>()

const route = useRoute()
const mobileOpen = ref(false)
watch(
  () => route.fullPath,
  () => (mobileOpen.value = false)
)
</script>

<template>
  <div class="flex min-h-screen bg-bg">
    <aside class="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div class="flex h-16 items-center gap-2 border-b border-border px-5 font-extrabold tracking-tight text-ink">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-white">
          <Icon name="lucide:ticket" class="size-4" />
        </span>
        {{ brand }}
      </div>
      <nav class="flex-1 space-y-1 p-3">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary-hover"
          active-class="!bg-primary-soft !text-primary-hover"
        >
          <Icon :name="item.icon" class="size-4.5" />
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="border-t border-border p-4">
        <button class="flex w-full items-center gap-2 rounded-control px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-black/5 hover:text-error" @click="emit('logout')">
          <Icon name="lucide:log-out" class="size-4.5" />
          Log out
        </button>
      </div>
    </aside>

    <Transition name="drawer-fade">
      <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/40 md:hidden" @click="mobileOpen = false" />
    </Transition>
    <Transition name="drawer-slide">
      <aside v-if="mobileOpen" class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface shadow-lift md:hidden">
        <div class="flex h-16 items-center justify-between border-b border-border px-5 font-extrabold tracking-tight text-ink">
          <span class="flex items-center gap-2">
            <span class="flex size-8 items-center justify-center rounded-full bg-primary text-white">
              <Icon name="lucide:ticket" class="size-4" />
            </span>
            {{ brand }}
          </span>
          <button @click="mobileOpen = false"><Icon name="lucide:x" class="size-5" /></button>
        </div>
        <nav class="flex-1 space-y-1 p-3">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-muted hover:bg-primary-soft hover:text-primary-hover"
            active-class="!bg-primary-soft !text-primary-hover"
          >
            <Icon :name="item.icon" class="size-4.5" />
            {{ item.label }}
          </NuxtLink>
        </nav>
        <div class="border-t border-border p-4">
          <button class="flex w-full items-center gap-2 rounded-control px-3 py-2.5 text-sm font-medium text-muted hover:bg-black/5 hover:text-error" @click="emit('logout')">
            <Icon name="lucide:log-out" class="size-4.5" />
            Log out
          </button>
        </div>
      </aside>
    </Transition>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur sm:px-6">
        <button class="rounded-control p-2 text-ink md:hidden" @click="mobileOpen = true">
          <Icon name="lucide:menu" class="size-6" />
        </button>
        <div class="flex items-center gap-2 md:hidden">
          <span class="font-extrabold text-ink">{{ brand }}</span>
        </div>
        <div class="ml-auto flex items-center gap-3">
          <BaseBadge v-if="badge" :tone="badge.tone" :pulse="badge.tone === 'warning'">{{ badge.label }}</BaseBadge>
          <div class="hidden text-right sm:block">
            <p class="text-sm font-semibold leading-tight text-ink">{{ identityLabel }}</p>
            <p v-if="identitySub" class="text-xs leading-tight text-muted">{{ identitySub }}</p>
          </div>
          <Avatar :seed="identityLabel" :size="36" />
        </div>
      </header>
      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(-100%);
}
</style>
