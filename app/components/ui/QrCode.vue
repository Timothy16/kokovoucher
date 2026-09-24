<!-- app/components/ui/QrCode.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{ value: string; size?: number }>(), { size: 220 })
const dataUrl = ref('')

async function render() {
  if (!import.meta.client) return
  const QRCode = (await import('qrcode')).default
  dataUrl.value = await QRCode.toDataURL(props.value, {
    width: props.size,
    margin: 1,
    color: { dark: '#1a1a1a', light: '#ffffff' }
  })
}

watch(() => props.value, render, { immediate: true })
</script>

<template>
  <div class="flex items-center justify-center rounded-control border border-border bg-white p-3">
    <img v-if="dataUrl" :src="dataUrl" :width="size" :height="size" alt="Voucher QR code" class="animate-fade-in" />
    <div v-else class="skeleton animate-shimmer rounded-control" :style="{ width: `${size}px`, height: `${size}px` }" />
  </div>
</template>
