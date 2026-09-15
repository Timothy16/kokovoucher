export function useCountdown(targetISO: Ref<string> | string) {
  const now = ref(Date.now())
  let timer: number | undefined

  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })
  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
  })

  const target = computed(() => new Date(unref(targetISO)).getTime())
  const msLeft = computed(() => Math.max(0, target.value - now.value))
  const isExpired = computed(() => msLeft.value <= 0)

  const label = computed(() => {
    const totalSeconds = Math.floor(msLeft.value / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  })

  const isUrgent = computed(() => msLeft.value > 0 && msLeft.value < 60 * 60 * 1000)

  return { msLeft, isExpired, label, isUrgent }
}
