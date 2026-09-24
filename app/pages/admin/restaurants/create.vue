<!-- app/pages/admin/restaurants/create.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { createRestaurant } = useMockDb()
const toast = useToast()

const form = reactive({ name: '', address: '', logoUrl: '', contactPerson: '', contactNumber: '', contactEmail: '', currency: '' })
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const success = ref<{ inviteUrl: string; invitePath: string; name: string } | null>(null)
const copied = ref(false)

const currencyOptions = [
  { value: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { value: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
  { value: 'USD', label: 'USD — US Dollar ($)' }
]

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name.trim()) errors.name = 'Enter the restaurant name.'
  if (!form.address.trim()) errors.address = 'Enter an address.'
  if (!form.contactPerson.trim()) errors.contactPerson = 'Enter a contact person.'
  if (!form.contactNumber.trim()) errors.contactNumber = 'Enter a contact number.'
  if (!/^\S+@\S+\.\S+$/.test(form.contactEmail)) errors.contactEmail = 'Enter a valid email — the invite goes here.'
  if (!form.currency) errors.currency = 'Select a currency.'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) return
  submitting.value = true
  await new Promise((r) => setTimeout(r, 500))
  const res = createRestaurant({
    name: form.name,
    address: form.address,
    logoUrl: form.logoUrl || null,
    contactPerson: form.contactPerson,
    contactNumber: form.contactNumber,
    contactEmail: form.contactEmail,
    currency: form.currency as 'NGN' | 'KES' | 'USD'
  })
  submitting.value = false

  if (!res.ok || !res.restaurant) {
    errors.contactEmail = res.error ?? 'Something went wrong.'
    toast.error('Could not add restaurant', res.error)
    return
  }

  const invitePath = `/restaurant/invite/${res.restaurant.inviteToken}`
  success.value = { inviteUrl: `${window.location.origin}${invitePath}`, invitePath, name: res.restaurant.name }
  toast.success('Restaurant added', 'Invite link sent to the contact email.')
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
      <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft">
        <Icon name="lucide:check" class="size-8 text-success" />
      </div>
      <h2 class="mt-4 text-xl font-bold text-ink">{{ success.name }} added</h2>
      <p class="mt-1.5 text-sm text-muted">Invite link sent — they'll set a password and their menu can go live.</p>
      <div class="mt-5 flex items-center gap-2 rounded-control border border-border bg-black/[0.02] px-3.5 py-2.5 text-left">
        <Icon name="lucide:link" class="size-4 shrink-0 text-muted" />
        <span class="truncate text-sm text-ink">{{ success.inviteUrl }}</span>
        <button class="ml-auto shrink-0 text-xs font-semibold text-primary" @click="copyLink">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </div>
      <p class="mt-3 text-xs text-muted">Demo has no real backend — this only exists in this browser tab's storage.</p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="navigateTo('/admin/restaurants/create')">Add another</BaseButton>
        <BaseButton block @click="navigateTo('/admin/restaurants')">View restaurants</BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-else class="animate-fade-up">
      <form class="space-y-4" @submit.prevent="submit">
        <BaseInput v-model="form.name" label="Restaurant name" icon="lucide:store" :error="errors.name" required />
        <BaseInput v-model="form.address" label="Address" icon="lucide:map-pin" :error="errors.address" required />
        <BaseInput v-model="form.logoUrl" label="Logo URL (optional)" icon="lucide:image" placeholder="https://…" />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.contactPerson" label="Contact person" icon="lucide:user" :error="errors.contactPerson" required />
          <BaseInput v-model="form.contactNumber" label="Contact number" type="tel" icon="lucide:phone" :error="errors.contactNumber" required />
        </div>
        <BaseInput v-model="form.contactEmail" label="Contact email" type="email" icon="lucide:mail" hint="The invite link is sent here." :error="errors.contactEmail" required />
        <BaseSelect v-model="form.currency" label="Currency" :options="currencyOptions" placeholder="Select" :error="errors.currency" required />
        <BaseButton type="submit" size="lg" block :loading="submitting">
          Add restaurant &amp; send invite
          <Icon name="lucide:send" class="size-4" />
        </BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
