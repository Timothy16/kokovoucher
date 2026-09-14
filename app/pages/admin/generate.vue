<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { approvedRestaurants, generateVoucher } = useMockDb()
const toast = useToast()

const form = reactive({ customerEmail: '', customerPhone: '', restaurantId: '', currency: '', amount: '' })
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const success = ref<{ claimUrl: string; claimPath: string; amount: number; currency: 'NGN' | 'KES' | 'USD'; restaurantName: string } | null>(null)
const copied = ref(false)

const currencyOptions = [
  { value: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { value: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
  { value: 'USD', label: 'USD — US Dollar ($)' }
]
const restaurantOptions = computed(() => approvedRestaurants.value.map((r) => ({ value: r.id, label: r.name })))

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.customerEmail.trim() || !/^\S+@\S+\.\S+$/.test(form.customerEmail)) errors.customerEmail = 'Enter a valid email.'
  if (!form.customerPhone.trim() || form.customerPhone.trim().length < 7) errors.customerPhone = 'Enter a valid phone number.'
  if (!form.restaurantId) errors.restaurantId = 'Select a restaurant.'
  if (!form.currency) errors.currency = 'Select a currency.'
  if (!form.amount || Number(form.amount) <= 0) errors.amount = 'Enter a valid amount.'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  await new Promise((r) => setTimeout(r, 500))
  const res = generateVoucher({
    customerEmail: form.customerEmail,
    customerPhone: form.customerPhone,
    restaurantId: form.restaurantId,
    currency: form.currency as 'NGN' | 'KES' | 'USD',
    amount: Number(form.amount)
  })
  submitting.value = false

  if (!res.ok || !res.voucher) {
    toast.error('Could not issue voucher', res.error)
    return
  }

  const claimPath = `/claim/${res.voucher.claimToken}`
  success.value = {
    claimUrl: `${window.location.origin}${claimPath}`,
    claimPath,
    amount: res.voucher.amount,
    currency: res.voucher.currency,
    restaurantName: res.voucher.restaurantName
  }
  toast.success('Voucher issued', 'Claim link sent to the customer.')
}

function reset() {
  success.value = null
  form.customerEmail = ''
  form.customerPhone = ''
  form.restaurantId = ''
  form.currency = ''
  form.amount = ''
}

async function copyLink() {
  if (!success.value) return
  try {
    await navigator.clipboard.writeText(success.value.claimUrl)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    toast.error('Could not copy link')
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Generate voucher</h1>
      <p class="text-sm text-muted">Issue a fixed-value voucher to an eligible customer.</p>
    </div>

    <BaseCard v-if="success" class="animate-pop-in text-center">
      <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft">
        <Icon name="lucide:check" class="size-8 text-success" />
      </div>
      <h2 class="mt-4 text-xl font-bold text-ink">Voucher sent!</h2>
      <p class="mt-1.5 text-sm text-muted">
        {{ formatCurrency(success.amount, success.currency) }} at {{ success.restaurantName }} — claim link delivered to the customer.
      </p>
      <div class="mt-5 flex items-center gap-2 rounded-control border border-border bg-black/[0.02] px-3.5 py-2.5 text-left">
        <Icon name="lucide:link" class="size-4 shrink-0 text-muted" />
        <span class="truncate text-sm text-ink">{{ success.claimUrl }}</span>
        <button class="ml-auto shrink-0 text-xs font-semibold text-primary" @click="copyLink">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </div>
      <p class="mt-3 text-xs text-muted">
        This demo has no real backend — the voucher only exists in this browser tab's storage, so preview it right here rather than in a new tab or window.
      </p>
      <button
        class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-control border border-border bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition-all hover:border-primary/40 hover:bg-primary-soft"
        @click="navigateTo(success.claimPath)"
      >
        <Icon name="lucide:eye" class="size-4" />
        Preview claim link as customer
      </button>
      <div class="mt-3 flex gap-3">
        <BaseButton variant="secondary" block @click="reset">Issue another</BaseButton>
        <BaseButton block @click="navigateTo('/admin/vouchers')">View vouchers</BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-else class="animate-fade-up">
      <form class="space-y-4" @submit.prevent="submit">
        <BaseInput v-model="form.customerEmail" label="Customer email" type="email" icon="lucide:mail" :error="errors.customerEmail" required />
        <BaseInput v-model="form.customerPhone" label="Customer phone" type="tel" icon="lucide:phone" placeholder="+234…" :error="errors.customerPhone" required />
        <BaseSelect v-model="form.restaurantId" label="Restaurant" :options="restaurantOptions" placeholder="Choose an approved restaurant" :error="errors.restaurantId" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseSelect v-model="form.currency" label="Currency" :options="currencyOptions" placeholder="Select" :error="errors.currency" required />
          <BaseInput v-model="form.amount" label="Amount" type="number" icon="lucide:banknote" placeholder="0.00" :error="errors.amount" required />
        </div>
        <BaseButton type="submit" size="lg" block :loading="submitting">
          Send voucher
          <Icon name="lucide:send" class="size-4" />
        </BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
