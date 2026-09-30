<!-- app/pages/contact.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const channels = [
  { icon: 'lucide:mail', label: 'Email', value: 'hello@kokosend.com' },
  { icon: 'lucide:message-circle', label: 'WhatsApp', value: '+234 800 000 0000' },
  { icon: 'lucide:store', label: 'Restaurant partnerships', value: 'partners@kokosend.com' }
]
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-14 sm:px-6">
    <h1 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Contact us</h1>
    <p class="mt-3 text-muted">Questions about a voucher, an order, or partnering your restaurant — we're here.</p>
    <div class="mt-8 space-y-3">
      <div v-for="c in channels" :key="c.label" class="flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-soft">
        <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon :name="c.icon" class="size-5" />
        </div>
        <div>
          <p class="text-xs text-muted">{{ c.label }}</p>
          <p class="font-semibold text-ink">{{ c.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
