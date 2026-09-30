<!-- app/components/layout/AppNavbar.vue -->
<script setup lang="ts">
const mobileOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border/80 bg-bg/85 backdrop-blur">
    <nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2 font-extrabold tracking-tight text-ink">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-white">
          <Icon name="lucide:ticket" class="size-4" />
        </span>
        KokoSend
      </NuxtLink>

      <div class="hidden items-center gap-8 md:flex">
        <a href="#how-it-works" class="text-sm font-medium text-muted transition-colors hover:text-ink">How it works</a>
        <a href="#for-restaurants" class="text-sm font-medium text-muted transition-colors hover:text-ink">For restaurants</a>
      </div>

      <div class="hidden items-center gap-3 md:flex">
        <NuxtLink to="/admin/login" class="text-sm font-medium text-muted transition-colors hover:text-ink">Admin login</NuxtLink>
        <BaseButton size="sm" @click="navigateTo('/restaurant/login')">
          Restaurant login
        </BaseButton>
      </div>

      <button class="rounded-control p-2 text-ink md:hidden" @click="mobileOpen = !mobileOpen">
        <Icon :name="mobileOpen ? 'lucide:x' : 'lucide:menu'" class="size-6" />
      </button>
    </nav>

    <Transition name="mobile-menu">
      <div v-if="mobileOpen" class="border-t border-border bg-surface px-4 pb-5 pt-3 md:hidden">
        <div class="flex flex-col gap-1">
          <a href="#how-it-works" class="rounded-control px-3 py-2.5 text-sm font-medium text-ink hover:bg-black/5" @click="mobileOpen = false">How it works</a>
          <a href="#for-restaurants" class="rounded-control px-3 py-2.5 text-sm font-medium text-ink hover:bg-black/5" @click="mobileOpen = false">For restaurants</a>
          <NuxtLink to="/admin/login" class="rounded-control px-3 py-2.5 text-sm font-medium text-ink hover:bg-black/5" @click="mobileOpen = false">Admin login</NuxtLink>
          <BaseButton class="mt-2" block @click="navigateTo('/restaurant/login')">Restaurant login</BaseButton>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  max-height: 0;
}
.mobile-menu-enter-to,
.mobile-menu-leave-from {
  max-height: 260px;
}
</style>
