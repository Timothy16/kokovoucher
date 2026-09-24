<!-- app/components/restaurant/QrScanner.vue -->
<script setup lang="ts">
const emit = defineEmits<{ decode: [value: string]; close: [] }>()

const video = ref<HTMLVideoElement | null>(null)
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
const error = ref('')
let stream: MediaStream | null = null
let rafId: number | undefined
let stopped = false

async function start() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (video.value) {
      video.value.srcObject = stream
      await video.value.play()
      tick()
    }
  } catch {
    error.value = "Couldn't access the camera. Check permissions or type the code instead."
  }
}

function tick() {
  if (stopped || !video.value || !ctx) return
  if (video.value.readyState === video.value.HAVE_ENOUGH_DATA) {
    canvas.width = video.value.videoWidth
    canvas.height = video.value.videoHeight
    ctx.drawImage(video.value, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    import('jsqr').then(({ default: jsQR }) => {
      const result = jsQR(imageData.data, imageData.width, imageData.height)
      if (result?.data) {
        emit('decode', result.data)
        return
      }
      rafId = requestAnimationFrame(tick)
    })
    return
  }
  rafId = requestAnimationFrame(tick)
}

function stopStream() {
  stopped = true
  if (rafId) cancelAnimationFrame(rafId)
  stream?.getTracks().forEach((t) => t.stop())
}

onMounted(start)
onUnmounted(stopStream)
</script>

<template>
  <div class="overflow-hidden rounded-card border border-border bg-black">
    <div class="relative aspect-square">
      <video ref="video" class="size-full object-cover" muted playsinline />
      <div class="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80" />
      <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-white">
        {{ error }}
      </div>
    </div>
    <button class="flex w-full items-center justify-center gap-2 bg-surface px-4 py-3 text-sm font-semibold text-ink" @click="$emit('close')">
      <Icon name="lucide:x" class="size-4" />
      Cancel scan
    </button>
  </div>
</template>
