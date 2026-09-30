<!-- app/pages/admin/restaurants/[id]/index.vue -->
<script setup lang="ts">
import { CURRENCY_OPTIONS, type Currency } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const supabase = useSupabase()
const api = useApi()
const toast = useToast()

const restaurantId = route.params.id as string

const { data, pending, error, refresh } = useAsyncData(`admin-restaurant-${restaurantId}`, async () => {
  const [restaurant, combos, orders, walkIns, payouts, wallet] = await Promise.all([
    supabase.from('restaurants').select().eq('id', restaurantId).maybeSingle(),
    supabase.from('combos').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('orders').select('id, reference, status, created_at').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(20),
    supabase.from('walk_ins').select('id, credited_amount, created_at').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(20),
    supabase.from('payouts').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('restaurant_wallets').select('pending_balance').eq('restaurant_id', restaurantId).maybeSingle()
  ])
  for (const r of [restaurant, combos, orders, walkIns, payouts, wallet]) if (r.error) throw r.error
  return {
    restaurant: restaurant.data,
    comboCount: combos.count ?? 0,
    orders: orders.data ?? [],
    walkIns: walkIns.data ?? [],
    payoutCount: payouts.count ?? 0,
    balance: Number(wallet.data?.pending_balance ?? 0)
  }
})
const restaurant = computed(() => data.value?.restaurant ?? null)
const logoUrl = computed(() => storagePublicUrl('restaurant-logos', restaurant.value?.logo_path ?? null))

// ---------- resend invite ----------
const resending = ref(false)
async function resend() {
  if (resending.value) return
  resending.value = true
  try {
    const res = await api<{ inviteUrl: string; emailed: boolean }>(`/api/admin/restaurants/${restaurantId}/resend-invite`, { method: 'POST' })
    if (res.emailed) toast.success('Invite resent', `Sent to ${restaurant.value?.contact_email}. The previous link no longer works.`)
    else toast.warning('Email failed', 'A new link was created but not emailed — check the notification log.')
    await refresh()
  } catch (e) {
    toast.error('Could not resend invite', apiErrorMessage(e))
  } finally {
    resending.value = false
  }
}

// ---------- disable / enable ----------
const confirmToggleOpen = ref(false)
const toggling = ref(false)
async function confirmToggle() {
  if (!restaurant.value || toggling.value) return
  toggling.value = true
  const disabling = restaurant.value.status === 'active'
  try {
    if (disabling) {
      const res = await api<{ releasedOrders: number }>(`/api/admin/restaurants/${restaurantId}/disable`, { method: 'POST' })
      toast.warning(
        'Restaurant disabled',
        res.releasedOrders
          ? `${res.releasedOrders} in-flight order${res.releasedOrders === 1 ? ' was' : 's were'} cancelled and the customers notified.`
          : 'They can no longer log in or receive orders.'
      )
    } else {
      await api(`/api/admin/restaurants/${restaurantId}/enable`, { method: 'POST' })
      toast.success('Restaurant re-enabled')
    }
    confirmToggleOpen.value = false
    await refresh()
  } catch (e) {
    toast.error(disabling ? 'Could not disable' : 'Could not re-enable', apiErrorMessage(e))
  } finally {
    toggling.value = false
  }
}

// ---------- edit ----------
const editOpen = ref(false)
const editForm = reactive({ name: '', address: '', logo: null as string | null, contactPerson: '', contactNumber: '', currency: '' as Currency | '' })
const editErrors = reactive<Record<string, string>>({})
const savingEdit = ref(false)

function openEdit() {
  if (!restaurant.value) return
  Object.assign(editForm, {
    name: restaurant.value.name,
    address: restaurant.value.address,
    logo: logoUrl.value,
    contactPerson: restaurant.value.contact_person,
    contactNumber: restaurant.value.contact_number,
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
  if (!restaurant.value || savingEdit.value || !validateEdit()) return
  savingEdit.value = true
  const originalPath = restaurant.value.logo_path
  let logoPath: string | null = originalPath
  try {
    logoPath = await resolveImageField('restaurant-logos', editForm.logo, originalPath)
    await api(`/api/admin/restaurants/${restaurantId}`, {
      method: 'PATCH',
      body: {
        name: editForm.name,
        address: editForm.address,
        logoPath,
        contactPerson: editForm.contactPerson,
        contactNumber: editForm.contactNumber,
        currency: editForm.currency
      }
    })
    editOpen.value = false
    toast.success('Restaurant updated')
    await refresh()
  } catch (e) {
    if (logoPath !== originalPath) await discardImage('restaurant-logos', logoPath)
    const message = apiErrorMessage(e, 'Could not save changes.')
    if (/currency/i.test(message)) editErrors.currency = message
    else toast.error('Could not save changes', message)
  } finally {
    savingEdit.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <NuxtLink to="/admin/restaurants" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to restaurants
    </NuxtLink>

    <LoadingState v-if="pending && !data" :rows="4" />
    <ErrorState v-else-if="error" message="We couldn't load this restaurant." @retry="refresh()" />
    <EmptyState v-else-if="!restaurant" icon="lucide:search-x" title="Restaurant not found" />

    <template v-else-if="data">
      <BaseCard class="animate-fade-up">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-4">
            <Avatar :seed="restaurant.name" :src="logoUrl" :size="52" />
            <div class="min-w-0">
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
          <div><p class="text-xs text-muted">Contact</p><p class="mt-0.5 truncate font-semibold text-ink">{{ restaurant.contact_person }}</p></div>
          <div><p class="text-xs text-muted">Phone</p><p class="mt-0.5 font-semibold text-ink">{{ restaurant.contact_number }}</p></div>
          <div><p class="text-xs text-muted">Email</p><p class="mt-0.5 truncate font-semibold text-ink">{{ restaurant.contact_email }}</p></div>
          <div><p class="text-xs text-muted">Currency</p><p class="mt-0.5 font-semibold text-ink">{{ restaurant.currency }}</p></div>
        </div>

        <p v-if="restaurant.status === 'invited'" class="mt-4 text-xs text-muted">
          Invited {{ new Date(restaurant.invited_at).toLocaleString() }} — waiting for them to set a password.
        </p>

        <div class="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
          <BaseButton size="sm" variant="secondary" @click="navigateTo(`/admin/restaurants/${restaurantId}/menu`)">
            <Icon name="lucide:utensils-crossed" class="size-4" />
            Manage menu
          </BaseButton>
          <BaseButton v-if="restaurant.status === 'invited'" size="sm" variant="secondary" :loading="resending" @click="resend">
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
        <StatCard label="Pending payout" :value="formatCurrency(data.balance, restaurant.currency)" icon="lucide:wallet" tone="warning" />
        <StatCard label="Combos" :value="data.comboCount" icon="lucide:utensils-crossed" tone="primary" />
        <StatCard label="Payouts made" :value="data.payoutCount" icon="lucide:banknote" tone="success" />
      </div>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Delivery orders</p></div>
        <EmptyState v-if="!data.orders.length" icon="lucide:package" title="No orders yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="o in data.orders" :key="o.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0">
              <NuxtLink :to="`/admin/orders/${o.id}`" class="font-mono text-sm font-semibold text-ink hover:text-primary">{{ o.reference }}</NuxtLink>
              <p class="truncate text-xs text-muted">{{ new Date(o.created_at).toLocaleString() }}</p>
            </div>
            <StatusBadge :status="o.status" />
          </li>
        </ul>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4"><p class="font-bold text-ink">Walk-in redemptions</p></div>
        <EmptyState v-if="!data.walkIns.length" icon="lucide:footprints" title="No walk-ins yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="w in data.walkIns" :key="w.id" class="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
            <span class="text-muted">{{ new Date(w.created_at).toLocaleString() }}</span>
            <span class="font-semibold text-ink">{{ formatCurrency(Number(w.credited_amount), restaurant.currency) }}</span>
          </li>
        </ul>
      </BaseCard>
    </template>

    <BaseModal v-model="confirmToggleOpen" :title="restaurant?.status === 'active' ? 'Disable restaurant?' : 'Re-enable restaurant?'">
      <p class="text-sm text-muted">
        {{ restaurant?.status === 'active'
          ? `${restaurant?.name} will be logged out, unable to log back in, and removed from the public menu until re-enabled. Any in-flight delivery orders (including ones already dispatched) will be cancelled and their vouchers released back to the customer.`
          : `${restaurant?.name} will be able to log in and appear on the public menu again.` }}
      </p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="confirmToggleOpen = false">Cancel</BaseButton>
        <BaseButton :variant="restaurant?.status === 'active' ? 'danger' : 'primary'" block :loading="toggling" @click="confirmToggle">Confirm</BaseButton>
      </div>
    </BaseModal>

    <BaseModal v-model="editOpen" title="Edit restaurant">
      <form class="space-y-4" @submit.prevent="saveEdit">
        <BaseInput v-model="editForm.name" label="Restaurant name" icon="lucide:store" :error="editErrors.name" required />
        <BaseInput v-model="editForm.address" label="Address" icon="lucide:map-pin" :error="editErrors.address" required />
        <ImageUpload v-model="editForm.logo" label="Logo (optional)" />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="editForm.contactPerson" label="Contact person" icon="lucide:user" :error="editErrors.contactPerson" required />
          <BaseInput v-model="editForm.contactNumber" label="Contact number" type="tel" icon="lucide:phone" :error="editErrors.contactNumber" required />
        </div>
        <BaseSelect v-model="editForm.currency" label="Currency" :options="CURRENCY_OPTIONS" :error="editErrors.currency" required />
        <p v-if="editForm.currency && restaurant && editForm.currency !== restaurant.currency" class="flex items-start gap-2 rounded-control bg-warning-soft px-3.5 py-2.5 text-xs font-medium text-ink">
          <Icon name="lucide:triangle-alert" class="mt-px size-4 shrink-0 text-warning" />
          Currency can only change once the restaurant has no pending payout and no delivery orders in progress.
        </p>
        <p class="text-xs text-muted">Login email ({{ restaurant?.contact_email }}) can't be changed here.</p>
        <BaseButton type="submit" block :loading="savingEdit">Save changes</BaseButton>
      </form>
    </BaseModal>
  </div>
</template>
