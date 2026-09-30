<!-- app/components/layout/AppFooter.vue -->
<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-border bg-surface">
    <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div class="flex flex-col items-start justify-between gap-8 sm:flex-row">
        <div>
          <div class="flex items-center gap-2 font-extrabold tracking-tight text-ink">
            <span class="flex size-8 items-center justify-center rounded-full bg-primary text-white">
              <Icon name="lucide:ticket" class="size-4" />
            </span>
            KokoSend
          </div>
          <p class="mt-2 max-w-xs text-sm text-muted">Rewards that turn into real footfall for your restaurant.</p>
        </div>
        <div class="flex flex-wrap gap-x-10 gap-y-4">
          <div class="flex flex-col gap-2 text-sm">
            <span class="font-semibold text-ink">Company</span>
            <NuxtLink to="/how-it-works" class="text-muted hover:text-ink">How it works</NuxtLink>
            <NuxtLink to="/faq" class="text-muted hover:text-ink">FAQ</NuxtLink>
            <NuxtLink to="/privacy" class="text-muted hover:text-ink">Privacy</NuxtLink>
            <NuxtLink to="/terms" class="text-muted hover:text-ink">Terms</NuxtLink>
            <NuxtLink to="/contact" class="text-muted hover:text-ink">Contact</NuxtLink>
          </div>
          <div class="flex flex-col gap-2 text-sm">
            <span class="font-semibold text-ink">Customers</span>
            <NuxtLink to="/menu" class="text-muted hover:text-ink">Browse menu</NuxtLink>
            <NuxtLink to="/track" class="text-muted hover:text-ink">Track an order</NuxtLink>
          </div>
          <div class="flex flex-col gap-2 text-sm">
            <span class="font-semibold text-ink">Team access</span>
            <NuxtLink to="/admin/login" class="text-muted hover:text-ink">Admin login</NuxtLink>
            <NuxtLink to="/restaurant/login" class="text-muted hover:text-ink">Restaurant login</NuxtLink>
          </div>
        </div>
      </div>
      <div class="mt-8 border-t border-border pt-6 text-xs text-muted">© {{ year }} KokoSend. All rights reserved.</div>
    </div>
  </footer>
</template>
