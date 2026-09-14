<script setup lang="ts">
withDefaults(defineProps<{ reason?: string }>(), { reason: "This link is invalid or has expired." })
</script>

<template>
  <div class="animate-fade-up text-center">
    <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-error-soft">
      <Icon name="lucide:link-2-off" class="size-7 text-error" />
    </div>
    <h1 class="mt-5 text-xl font-bold text-ink">This link doesn't work anymore</h1>
    <p class="mt-2 text-sm text-muted">{{ reason }}</p>
    <p class="mt-6 text-sm text-muted">If you think this is a mistake, reach out to the restaurant that sent you this reward.</p>
    <BaseButton class="mt-6" variant="secondary" @click="navigateTo('/')">Go to KokoVoucher</BaseButton>
  </div>
</template>
