<!-- app/pages/restaurant/disabled.vue -->
<!-- Shown after a disabled restaurant tries to sign in, or is disabled mid-session. -->
<script setup lang="ts">
definePageMeta({ layout: 'customer' })
</script>

<template>
  <BaseCard class="animate-pop-in text-center">
    <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-error-soft">
      <Icon name="lucide:ban" class="size-7 text-error" />
    </div>
    <h1 class="mt-5 text-xl font-bold text-ink">Account disabled</h1>
    <p class="mt-2 text-sm text-muted">
      This restaurant account has been disabled by KokoSend admin and can't log in or receive orders right now.
      Contact support if you think this is a mistake.
    </p>
    <BaseButton class="mt-6" variant="secondary" @click="navigateTo('/restaurant/login')">Back to login</BaseButton>
  </BaseCard>
</template>
