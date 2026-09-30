<!-- app/pages/admin/restaurants/create.vue -->
<script setup lang="ts">
import { CURRENCY_OPTIONS } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const api = useApi()
const toast = useToast()

const form = reactive({ name: '', address: '', logo: null as string | null, contactPerson: '', contactNumber: '', contactEmail: '', currency: '' })
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const success = ref<{ inviteUrl: string; name: string; emailed: boolean } | null>(null)
const copied = ref(false)

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name.trim()) errors.name = 'Enter the restaurant name.'
  if (!form.address.trim()) errors.address = 'Enter an address.'
  if (!form.contactPerson.trim()) errors.contactPerson = 'Enter a contact person.'
  if (!form.contactNumber.trim()) errors.contactNumber = 'Enter a contact number.'
  if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) errors.contactEmail = 'Enter a valid email — the invite goes here.'
  if (!form.currency) errors.currency = 'Select a currency.'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (submitting.value || !validate()) return
  submitting.value = true
  let logoPath: string | null = null
  try {
    logoPath = await resolveImageField('restaurant-logos', form.logo, null)
    const res = await api<{ id: string; name: string; inviteUrl: string; emailed: boolean }>('/api/admin/restaurants', {
      method: 'POST',
      body: {
        name: form.name,
        address: form.address,
        logoPath,
        contactPerson: form.contactPerson,
        contactNumber: form.contactNumber,
        contactEmail: form.contactEmail,
        currency: form.currency
      }
    })
    success.value = { inviteUrl: res.inviteUrl, name: res.name, emailed: res.emailed }
    if (res.emailed) toast.success('Restaurant added', 'Invite link emailed to the contact.')
    else toast.warning('Restaurant added — email failed', 'Copy the invite link and send it manually.')
  } catch (e) {
    await discardImage('restaurant-logos', logoPath)
    const message = apiErrorMessage(e)
    if (/email/i.test(message)) errors.contactEmail = message
    toast.error('Could not add restaurant', message)
  } finally {
    submitting.value = false
  }
}

async function copyLink() {
  if (!success.value) return
  try {
    await navigator.clipboard.writeText(success.value.inviteUrl)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    toast.error('Could not copy link')
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6">
    <NuxtLink to="/admin/restaurants" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to restaurants
    </NuxtLink>

    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Add a restaurant</h1>
      <p class="text-sm text-muted">An invite link is sent to the contact email — they set a password and go live.</p>
    </div>

    <BaseCard v-if="success" class="animate-pop-in text-center">
      <div class="mx-auto flex size-16 items-center justify-center rounded-full" :class="success.emailed ? 'bg-success-soft' : 'bg-warning-soft'">
        <Icon :name="success.emailed ? 'lucide:check' : 'lucide:mail-warning'" class="size-8" :class="success.emailed ? 'text-success' : 'text-warning'" />
      </div>
      <h2 class="mt-4 text-xl font-bold text-ink">{{ success.name }} added</h2>
      <p class="mt-1.5 text-sm text-muted">
        {{ success.emailed ? "Invite link emailed — they'll set a password and go live." : "We couldn't email the invite. Copy the link below and send it to them directly." }}
      </p>
      <div class="mt-5 flex items-center gap-2 rounded-control border border-border bg-black/[0.02] px-3.5 py-2.5 text-left">
        <Icon name="lucide:link" class="size-4 shrink-0 text-muted" />
        <span class="truncate text-sm text-ink">{{ success.inviteUrl }}</span>
        <button class="ml-auto shrink-0 text-xs font-semibold text-primary" @click="copyLink">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </div>
      <p class="mt-3 text-xs text-muted">The link works once and expires in 7 days. Only share it with the restaurant.</p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="reloadNuxtApp({ path: '/admin/restaurants/create' })">Add another</BaseButton>
        <BaseButton block @click="navigateTo('/admin/restaurants')">View restaurants</BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-else class="animate-fade-up">
      <form class="space-y-4" @submit.prevent="submit">
        <BaseInput v-model="form.name" label="Restaurant name" icon="lucide:store" :error="errors.name" required />
        <BaseInput v-model="form.address" label="Address" icon="lucide:map-pin" :error="errors.address" required />
        <ImageUpload v-model="form.logo" label="Logo (optional)" />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.contactPerson" label="Contact person" icon="lucide:user" :error="errors.contactPerson" required />
          <BaseInput v-model="form.contactNumber" label="Contact number" type="tel" icon="lucide:phone" :error="errors.contactNumber" required />
        </div>
        <BaseInput v-model="form.contactEmail" label="Contact email" type="email" icon="lucide:mail" hint="The invite link is sent here, and it becomes their login." :error="errors.contactEmail" required />
        <BaseSelect v-model="form.currency" label="Currency" :options="CURRENCY_OPTIONS" placeholder="Select" :error="errors.currency" required />
        <BaseButton type="submit" size="lg" block :loading="submitting">
          Add restaurant &amp; send invite
          <Icon name="lucide:send" class="size-4" />
        </BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
