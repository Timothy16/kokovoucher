<!-- app/pages/admin/restaurants/[id]/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const { db, getRestaurant, updateRestaurant, resendInvite, disableRestaurant, enableRestaurant, pendingBalance, payoutHistory, combosByRestaurant } = useMockDb()
const toast = useToast()

const currencyOptions = [
  { value: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { value: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
  { value: 'USD', label: 'USD — US Dollar ($)' }
]

const restaurantId = route.params.id as string
const restaurant = computed(() => getRestaurant(restaurantId))
const combos = combosByRestaurant(restaurantId)

const orders = computed(() =>
  db.value.orders.filter((o) => o.restaurantId === restaurantId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
)
const walkIns = computed(() =>
  db.value.walkIns.filter((w) => w.restaurantId === restaurantId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
)
const balance = computed(() => pendingBalance(restaurantId))
const history = computed(() => payoutHistory(restaurantId))

function resend() {
  const res = resendInvite(restaurantId)
  if (res.ok) toast.success('Invite resent', `Sent to ${restaurant.value?.contactEmail}`)
}

const confirmToggleOpen = ref(false)
function confirmToggle() {
  if (!restaurant.value) return
  if (restaurant.value.status === 'active') {
    disableRestaurant(restaurantId)
    toast.warning('Restaurant disabled', 'They can no longer log in or receive orders.')
  } else if (restaurant.value.status === 'disabled') {
    enableRestaurant(restaurantId)
    toast.success('Restaurant re-enabled')
  }
  confirmToggleOpen.value = false
}

const editOpen = ref(false)
const editForm = reactive({ name: '', address: '', logoUrl: '', contactPerson: '', contactNumber: '', currency: '' })
const editErrors = reactive<Record<string, string>>({})
const savingEdit = ref(false)

function openEdit() {
  if (!restaurant.value) return
  Object.assign(editForm, {
    name: restaurant.value.name,
    address: restaurant.value.address,
    logoUrl: restaurant.value.logoUrl ?? '',
    contactPerson: restaurant.value.contactPerson,
    contactNumber: restaurant.value.contactNumber,
    currency: restaurant.value.currency
  })
  Object.keys(editErrors).forEach((k) => delete editErrors[k])
  editOpen.value = true
}

function validateEdit() {
  Object.keys(editErrors).forEach((k) => delete editErrors[k])
  if (!editForm.name.trim()) editErrors.name = 'Enter the restaurant name.'
  if (!editForm.address.trim()) editErrors.address = 'Enter an address.'
  if (!editForm.contactPerson.trim()) editErrors.contactPerson = 'Enter a contact person.'
  if (!editForm.contactNumber.trim()) editErrors.contactNumber = 'Enter a contact number.'
  if (!editForm.currency) editErrors.currency = 'Select a currency.'
  return Object.keys(editErrors).length === 0
}

async function saveEdit() {
  if (!validateEdit()) return
  savingEdit.value = true
  await new Promise((r) => setTimeout(r, 350))
  const res = updateRestaurant(restaurantId, {
    name: editForm.name.trim(),
    address: editForm.address.trim(),
    logoUrl: editForm.logoUrl.trim() || null,
    contactPerson: editForm.contactPerson.trim(),
    contactNumber: editForm.contactNumber.trim(),
    currency: editForm.currency as 'NGN' | 'KES' | 'USD'
  })
  savingEdit.value = false
  if (!res.ok) {
    editErrors.currency = res.error ?? 'Could not save changes.'
    return
  }
  editOpen.value = false
  toast.success('Restaurant updated')
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <NuxtLink to="/admin/restaurants" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to restaurants
    </NuxtLink>

    <EmptyState v-if="!restaurant" icon="lucide:search-x" title="Restaurant not found" />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-4">
            <Avatar :seed="restaurant.name" :size="52" />
            <div>
              <p class="text-xl font-bold text-ink">{{ restaurant.name }}</p>
              <p class="text-sm text-muted">{{ restaurant.address }}</p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <StatusBadge :status="restaurant.status" />
            <button class="rounded-full p-1.5 text-muted transition-colors hover:bg-black/5 hover:text-ink" aria-label="Edit restaurant" @click="openEdit">
              <Icon name="lucide:pencil" class="size-4" />
            </button>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
          <div><p class="text-xs text-muted">Contact</p><p class="mt-0.5 truncate font-semibold text-ink">{{ restaurant.contactPerson }}</p></div>
          <div><p class="text-xs text-muted">Phone</p><p class="mt-0.5 font-semibold text-ink">{{ restaurant.contactNumber }}</p></div>
          <div><p class="text-xs text-muted">Email</p><p class="mt-0.5 truncate font-semibold text-ink">{{ restaurant.contactEmail }}</p></div>
          <div><p class="text-xs text-muted">Currency</p><p class="mt-0.5 font-semibold text-ink">{{ restaurant.currency }}</p></div>
        </div>

        <div class="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
          <BaseButton size="sm" variant="secondary" @click="navigateTo(`/admin/restaurants/${restaurantId}/menu`)">
            <Icon name="lucide:utensils-crossed" class="size-4" />
            Manage menu
          </BaseButton>
          <BaseButton v-if="restaurant.status === 'invited'" size="sm" variant="secondary" @click="resend">
            <Icon name="lucide:send" class="size-4" />
            Resend invite
          </BaseButton>
          <BaseButton
            v-if="restaurant.status === 'active' || restaurant.status === 'disabled'"
            size="sm"
            :variant="restaurant.status === 'active' ? 'danger' : 'primary'"
            @click="confirmToggleOpen = true"
          >
            <Icon :name="restaurant.status === 'active' ? 'lucide:ban' : 'lucide:check'" class="size-4" />
            {{ restaurant.status === 'active' ? 'Disable' : 'Re-enable' }}
          </BaseButton>
        </div>
      </BaseCard>

      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending payout" :value="formatCurrency(balance, restaurant.currency)" icon="lucide:wallet" tone="warning" />
        <StatCard label="Combos" :value="combos.length" icon="lucide:utensils-crossed" tone="primary" />
        <StatCard label="Payouts made" :value="history.length" icon="lucide:banknote" tone="success" />
      </div>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Delivery orders</p></div>
        <EmptyState v-if="!orders.length" icon="lucide:package" title="No orders yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="o in orders" :key="o.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0">
              <NuxtLink :to="`/admin/orders/${o.id}`" class="font-mono text-sm font-semibold text-ink hover:text-primary">{{ o.reference }}</NuxtLink>
              <p class="truncate text-xs text-muted">{{ new Date(o.createdAt).toLocaleString() }}</p>
            </div>
            <StatusBadge :status="o.status" />
          </li>
        </ul>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Walk-in redemptions</p></div>
        <EmptyState v-if="!walkIns.length" icon="lucide:footprints" title="No walk-ins yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="w in walkIns" :key="w.id" class="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
            <span class="text-muted">{{ new Date(w.createdAt).toLocaleString() }}</span>
            <span class="font-semibold text-ink">{{ formatCurrency(w.creditedAmount, restaurant.currency) }}</span>
          </li>
        </ul>
      </BaseCard>
    </template>

    <BaseModal v-model="confirmToggleOpen" :title="restaurant?.status === 'active' ? 'Disable restaurant?' : 'Re-enable restaurant?'">
      <p class="text-sm text-muted">
        {{ restaurant?.status === 'active'
          ? `${restaurant?.name} will be logged out, unable to log back in, and removed from the public menu until re-enabled. Any in-flight delivery orders will be cancelled and their vouchers released back to the customer.`
          : `${restaurant?.name} will be able to log in and appear on the public menu again.` }}
      </p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="confirmToggleOpen = false">Cancel</BaseButton>
        <BaseButton :variant="restaurant?.status === 'active' ? 'danger' : 'primary'" block @click="confirmToggle">Confirm</BaseButton>
      </div>
    </BaseModal>

    <BaseModal v-model="editOpen" title="Edit restaurant">
      <form class="space-y-4" @submit.prevent="saveEdit">
        <BaseInput v-model="editForm.name" label="Restaurant name" icon="lucide:store" :error="editErrors.name" required />
        <BaseInput v-model="editForm.address" label="Address" icon="lucide:map-pin" :error="editErrors.address" required />
        <BaseInput v-model="editForm.logoUrl" label="Logo URL (optional)" icon="lucide:image" />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="editForm.contactPerson" label="Contact person" icon="lucide:user" :error="editErrors.contactPerson" required />
          <BaseInput v-model="editForm.contactNumber" label="Contact number" type="tel" icon="lucide:phone" :error="editErrors.contactNumber" required />
        </div>
        <BaseSelect v-model="editForm.currency" label="Currency" :options="currencyOptions" :error="editErrors.currency" required />
        <p v-if="editForm.currency && restaurant && editForm.currency !== restaurant.currency" class="flex items-start gap-2 rounded-control bg-warning-soft px-3.5 py-2.5 text-xs font-medium text-ink">
          <Icon name="lucide:triangle-alert" class="mt-px size-4 shrink-0 text-warning" />
          Changing currency only affects new orders and walk-ins going forward — it won't touch vouchers already reserved here.
        </p>
        <p class="text-xs text-muted">Login email ({{ restaurant?.contactEmail }}) can't be changed here — voiding and re-inviting is required.</p>
        <BaseButton type="submit" block :loading="savingEdit">Save changes</BaseButton>
      </form>
    </BaseModal>
  </div>
</template>
