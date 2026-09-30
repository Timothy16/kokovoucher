<!-- app/pages/admin/generate.vue -->
<script setup lang="ts">
import { CURRENCY_OPTIONS, type Currency } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const api = useApi()
const toast = useToast()

const form = reactive({ customerFullName: '', customerPhone: '', customerEmail: '', secretKey: '', currency: '' as Currency | '', amount: '' })
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const confirmOpen = ref(false)
const success = ref<{ id: string; code: string; amount: number; currency: Currency; secretKey: string; emailed: boolean } | null>(null)

const amountNumber = computed(() => Number(form.amount))

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (form.customerFullName.trim().length < 2) errors.customerFullName = "Enter the customer's full name."
  if (!/^\+?[0-9][0-9 ()-]{6,19}$/.test(form.customerPhone.trim())) errors.customerPhone = 'Enter a valid phone number, e.g. +2348012345678.'
  if (!/^\S+@\S+\.\S+$/.test(form.customerEmail.trim())) errors.customerEmail = 'Enter a valid email.'
  if (form.secretKey.trim().length < 2) errors.secretKey = "Enter the customer's KokoSend username."
  else if (/\s/.test(form.secretKey.trim())) errors.secretKey = 'A KokoSend username has no spaces.'
  if (!form.currency) errors.currency = 'Select a currency.'
  if (!form.amount || !form.currency || !isValidAmount(amountNumber.value, form.currency)) {
    errors.amount = form.currency === 'USD' ? 'Enter an amount, up to 2 decimals.' : 'Enter a whole amount.'
  }
  return Object.keys(errors).length === 0
}

function askConfirm() {
  if (validate()) confirmOpen.value = true
}

// Rule 19: the confirm button can't double-submit — it's ignored while a request is in flight,
// and the database refuses a second active voucher for the same username anyway.
async function submit() {
  if (submitting.value || !form.currency) return
  submitting.value = true
  try {
    const res = await api<{ id: string; code: string; amount: number; currency: Currency; secretKey: string; emailed: boolean }>('/api/admin/vouchers', {
      method: 'POST',
      body: {
        customerFullName: form.customerFullName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        secretKey: form.secretKey,
        currency: form.currency,
        amount: amountNumber.value
      }
    })
    confirmOpen.value = false
    success.value = res
    if (res.emailed) toast.success('Voucher issued', `Emailed to ${form.customerEmail.trim()}.`)
    else toast.warning('Voucher issued — email failed', 'Check the notification log, then use Resend.')
  } catch (e) {
    confirmOpen.value = false
    const message = apiErrorMessage(e, 'Could not issue the voucher.')
    if (/username/i.test(message)) errors.secretKey = message
    else if (/amount/i.test(message)) errors.amount = message
    toast.error('Could not issue voucher', message)
  } finally {
    submitting.value = false
  }
}

function reset() {
  success.value = null
  Object.assign(form, { customerFullName: '', customerPhone: '', customerEmail: '', secretKey: '', currency: '', amount: '' })
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Generate voucher</h1>
      <p class="text-sm text-muted">Issue a fixed-value voucher to a named customer. It's valid until the end of day 7 (UTC).</p>
    </div>

    <BaseCard v-if="success" class="animate-pop-in text-center">
      <div class="mx-auto flex size-16 items-center justify-center rounded-full" :class="success.emailed ? 'bg-success-soft' : 'bg-warning-soft'">
        <Icon :name="success.emailed ? 'lucide:check' : 'lucide:mail-warning'" class="size-8" :class="success.emailed ? 'text-success' : 'text-warning'" />
      </div>
      <h2 class="mt-4 text-xl font-bold text-ink">{{ success.emailed ? 'Voucher sent!' : 'Voucher issued' }}</h2>
      <p class="mt-1.5 text-sm text-muted">
        {{ formatCurrency(success.amount, success.currency) }} issued to {{ success.secretKey }}.
        {{ success.emailed ? 'The code and menu link are on their way by email.' : "We couldn't email it — open the voucher and use Resend." }}
      </p>
      <div class="mt-5 rounded-control border border-border bg-black/[0.02] px-3.5 py-2.5">
        <p class="text-xs text-muted">Voucher code</p>
        <p class="mt-0.5 font-mono text-lg font-bold tracking-widest text-ink">{{ success.code }}</p>
      </div>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="reset">Issue another</BaseButton>
        <BaseButton block @click="navigateTo(`/admin/vouchers/${success.id}`)">View voucher</BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-else class="animate-fade-up">
      <form class="space-y-4" @submit.prevent="askConfirm">
        <BaseInput v-model="form.customerFullName" label="Full name" icon="lucide:user" :error="errors.customerFullName" required />
        <BaseInput v-model="form.customerPhone" label="Phone number" type="tel" icon="lucide:phone" placeholder="+234…" :error="errors.customerPhone" required />
        <BaseInput v-model="form.customerEmail" label="Email" type="email" icon="lucide:mail" hint="The voucher code is sent here." :error="errors.customerEmail" required />
        <BaseInput v-model="form.secretKey" label="Secret key (KokoSend username)" icon="lucide:key-round" hint="The customer enters this with the code to use the voucher." :error="errors.secretKey" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseSelect v-model="form.currency" label="Currency" :options="CURRENCY_OPTIONS" placeholder="Select" :error="errors.currency" required />
          <BaseInput v-model="form.amount" label="Value" type="number" icon="lucide:banknote" :placeholder="form.currency === 'USD' ? '0.00' : '0'" :error="errors.amount" required />
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
        <span class="font-semibold text-ink">{{ form.secretKey.trim() }}</span>
        ({{ form.customerFullName.trim() }})?
      </p>
      <div class="mt-4 rounded-control border border-border bg-black/[0.02] px-4 py-3 text-sm">
        <div class="flex justify-between gap-3"><span class="text-muted">Value</span><span class="font-bold text-ink">{{ form.currency ? formatCurrency(amountNumber || 0, form.currency) : '—' }}</span></div>
        <div class="mt-1.5 flex justify-between gap-3"><span class="text-muted">Sent to</span><span class="truncate font-semibold text-ink">{{ form.customerEmail.trim() }}</span></div>
      </div>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block :disabled="submitting" @click="confirmOpen = false">Cancel</BaseButton>
        <BaseButton block :loading="submitting" :disabled="submitting" @click="submit">Yes, create voucher</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
