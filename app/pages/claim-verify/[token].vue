<script setup lang="ts">
definePageMeta({ layout: 'customer' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { getVoucherByClaimToken, verifyOtp, requestOtpResend } = useMockDb()

const token = route.params.token as string
const voucher = computed(() => getVoucherByClaimToken(token))
const status = computed(() => (voucher.value ? computeEffectiveStatus(voucher.value) : null))

watchEffect(() => {
  if (voucher.value && (status.value === 'active' || status.value === 'redeemed')) {
    router.replace(`/voucher/${token}`)
  }
})

const code = ref('')
const error = ref('')
const verifying = ref(false)
const locked = ref(false)
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | undefined

onUnmounted(() => cooldownTimer && clearInterval(cooldownTimer))

function startCooldownDisplay(seconds: number) {
  cooldown.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && cooldownTimer) clearInterval(cooldownTimer)
  }, 1000)
}

onMounted(() => startCooldownDisplay(60))

async function submit() {
  if (!voucher.value || code.value.trim().length < 4) return
  error.value = ''
  verifying.value = true
  await new Promise((r) => setTimeout(r, 450))
  const res = verifyOtp(voucher.value.id, code.value.trim())
  verifying.value = false

  if (res.ok) {
    toast.success('Voucher activated', 'Show this at the counter to redeem.')
    router.push(`/voucher/${token}`)
    return
  }

  if (res.reason === 'EXPIRED') {
    error.value = 'This voucher just expired.'
  } else if (res.reason === 'LOCKED') {
    locked.value = true
    error.value = 'Too many incorrect attempts. This voucher is now locked.'
  } else if (res.reason === 'WRONG_CODE') {
    error.value = `That code isn't right. ${res.attemptsLeft} attempt${res.attemptsLeft === 1 ? '' : 's'} left.`
    if (res.attemptsLeft === 0) locked.value = true
  } else {
    error.value = 'This voucher has already been activated.'
  }
}

function resend() {
  if (!voucher.value || cooldown.value > 0) return
  const res = requestOtpResend(voucher.value.id)
  if (res.ok) {
    toast.info('Code resent', 'A new one-time code has been sent.')
    startCooldownDisplay(60)
  } else if (res.secondsLeft) {
    startCooldownDisplay(res.secondsLeft)
  }
}
</script>

<template>
  <div>
    <InvalidLink v-if="!voucher" />
    <InvalidLink v-else-if="status === 'expired'" reason="This voucher's 24-hour window has passed." />

    <BaseCard v-else class="animate-pop-in">
      <button class="mb-4 flex items-center gap-1 text-sm font-medium text-muted hover:text-ink" @click="router.back()">
        <Icon name="lucide:arrow-left" class="size-4" />
        Back
      </button>
      <div class="text-center">
        <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
          <Icon name="lucide:message-square-lock" class="size-6 text-primary" />
        </div>
        <h1 class="mt-4 text-xl font-bold text-ink">Enter your code</h1>
        <p class="mt-1.5 text-sm text-muted">We sent a 4-digit code to {{ voucher.customerPhone }}</p>
      </div>

      <div class="mt-6 rounded-control border border-dashed border-primary/40 bg-primary-soft/50 px-3.5 py-2.5 text-center text-xs font-medium text-primary-hover">
        Demo mode — your code is <span class="font-mono font-bold tracking-widest">{{ voucher.otp }}</span>
      </div>

      <form class="mt-5 space-y-4" @submit.prevent="submit">
        <BaseInput
          v-model="code"
          label="One-time code"
          placeholder="••••"
          type="text"
          inputmode="numeric"
          :error="error"
          :disabled="locked"
          autocomplete="one-time-code"
        />
        <BaseButton type="submit" size="lg" block :loading="verifying" :disabled="locked || code.trim().length < 4">
          Confirm &amp; activate
        </BaseButton>
      </form>

      <div class="mt-5 text-center text-sm">
        <button
          class="font-semibold text-primary transition-colors disabled:cursor-not-allowed disabled:text-muted"
          :disabled="cooldown > 0"
          @click="resend"
        >
          {{ cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code' }}
        </button>
      </div>
    </BaseCard>
  </div>
</template>
