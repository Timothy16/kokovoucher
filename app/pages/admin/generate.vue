<!-- app/pages/admin/generate.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { generateVoucher, hasActiveVoucher } = useMockDb()
const toast = useToast()

const form = reactive({ customerFullName: '', customerPhone: '', customerEmail: '', secretKey: '', currency: '', amount: '' })
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const confirmOpen = ref(false)
const success = ref<{ code: string; amount: number; currency: 'NGN' | 'KES' | 'USD'; secretKey: string } | null>(null)

const currencyOptions = [
  { value: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { value: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
  { value: 'USD', label: 'USD — US Dollar ($)' }
]

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.customerFullName.trim()) errors.customerFullName = "Enter the customer's full name."
  if (!form.customerPhone.trim() || form.customerPhone.trim().length < 7) errors.customerPhone = 'Enter a valid phone number.'
  if (!/^\S+@\S+\.\S+$/.test(form.customerEmail)) errors.customerEmail = 'Enter a valid email.'
  if (!form.secretKey.trim()) errors.secretKey = "Enter the customer's KokoSend username."
  if (!form.currency) errors.currency = 'Select a currency.'
  if (!form.amount || Number(form.amount) <= 0) errors.amount = 'Enter a valid amount.'
  return Object.keys(errors).length === 0
}

function askConfirm() {
  if (!validate()) return
  if (hasActiveVoucher(form.secretKey)) {
    errors.secretKey = 'This username already has an active, unredeemed voucher.'
    return
  }
  confirmOpen.value = true
}

async function submit() {
  confirmOpen.value = false
  submitting.value = true
  await new Promise((r) => setTimeout(r, 500))
  const res = generateVoucher({
    customerFullName: form.customerFullName,
    customerPhone: form.customerPhone,
    customerEmail: form.customerEmail,
    secretKey: form.secretKey,
    currency: form.currency as 'NGN' | 'KES' | 'USD',
    amount: Number(form.amount)
  })
  submitting.value = false

  if (!res.ok || !res.voucher) {
    toast.error('Could not issue voucher', res.error)
    return
  }

  success.value = { code: res.voucher.code, amount: res.voucher.amount, currency: res.voucher.currency, secretKey: res.voucher.secretKey }
  toast.success('Voucher issued', 'Email and WhatsApp notifications sent.')
}

function reset() {
  success.value = null
  form.customerFullName = ''
  form.customerPhone = ''
  form.customerEmail = ''
  form.secretKey = ''
  form.currency = ''
  form.amount = ''
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Generate voucher</h1>
      <p class="text-sm text-muted">Issue a fixed-value voucher to a named customer.</p>
    </div>

    <BaseCard v-if="success" class="animate-pop-in text-center">
      <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft">
        <Icon name="lucide:check" class="size-8 text-success" />
      </div>
      <h2 class="mt-4 text-xl font-bold text-ink">Voucher sent!</h2>
      <p class="mt-1.5 text-sm text-muted">
        {{ formatCurrency(success.amount, success.currency) }} issued to {{ success.secretKey }} — email and WhatsApp sent with the code and menu link.
      </p>
      <div class="mt-5 rounded-control border border-border bg-black/[0.02] px-3.5 py-2.5">
        <p class="text-xs text-muted">Voucher code</p>
        <p class="mt-0.5 font-mono text-lg font-bold tracking-widest text-ink">{{ success.code }}</p>
      </div>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="reset">Issue another</BaseButton>
        <BaseButton block @click="navigateTo('/admin/vouchers')">View vouchers</BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-else class="animate-fade-up">
      <form class="space-y-4" @submit.prevent="askConfirm">
        <BaseInput v-model="form.customerFullName" label="Full name" icon="lucide:user" :error="errors.customerFullName" required />
        <BaseInput v-model="form.customerPhone" label="Phone number" type="tel" icon="lucide:phone" placeholder="+234…" :error="errors.customerPhone" required />
        <BaseInput v-model="form.customerEmail" label="Email" type="email" icon="lucide:mail" :error="errors.customerEmail" required />
        <BaseInput v-model="form.secretKey" label="Secret key (KokoSend username)" icon="lucide:key-round" hint="This is what the customer enters at checkout — their KokoSend username." :error="errors.secretKey" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseSelect v-model="form.currency" label="Currency" :options="currencyOptions" placeholder="Select" :error="errors.currency" required />
          <BaseInput v-model="form.amount" label="Price" type="number" icon="lucide:banknote" placeholder="0.00" :error="errors.amount" required />
        </div>
        <BaseButton type="submit" size="lg" block>
          Create voucher
          <Icon name="lucide:arrow-right" class="size-4" />
        </BaseButton>
      </form>
    </BaseCard>

    <BaseModal v-model="confirmOpen" title="Create this voucher?">
      <p class="text-sm text-muted">
        Are you sure you want to create a voucher for
        <span class="font-semibold text-ink">{{ form.secretKey }}</span>
        ({{ form.customerFullName }})? This sends {{ formatCurrency(Number(form.amount) || 0, (form.currency as 'NGN' | 'KES' | 'USD') || 'NGN') }} to
        {{ form.customerEmail }} by email and WhatsApp.
      </p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="confirmOpen = false">Cancel</BaseButton>
        <BaseButton block :loading="submitting" @click="submit">Yes, create voucher</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
