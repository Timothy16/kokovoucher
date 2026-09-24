<!-- app/pages/admin/vouchers/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db, resendVoucherNotification, voidVoucher, VERIFY_MAX_ATTEMPTS } = useMockDb()
const toast = useToast()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const filters = reactive({ status: '', currency: '', date: '' })

const statusOptions = [
  { value: 'issued', label: 'Issued' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'redeemed', label: 'Redeemed' },
  { value: 'expired', label: 'Expired' },
  { value: 'void', label: 'Void' }
]
const currencyOptions = [
  { value: 'NGN', label: 'NGN' },
  { value: 'KES', label: 'KES' },
  { value: 'USD', label: 'USD' }
]

const hasFilters = computed(() => !!(filters.status || filters.currency || filters.date))
function clearFilters() {
  filters.status = ''
  filters.currency = ''
  filters.date = ''
}

const rows = computed(() => {
  return [...db.value.vouchers]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .filter((v) => {
      const status = computeEffectiveVoucherStatus(v)
      if (filters.status && status !== filters.status) return false
      if (filters.currency && v.currency !== filters.currency) return false
      if (filters.date && v.createdAt.slice(0, 10) !== filters.date) return false
      return true
    })
})

function canAct(v: (typeof rows.value)[number]) {
  const status = computeEffectiveVoucherStatus(v)
  return status === 'issued' || status === 'reserved'
}
function canVoid(v: (typeof rows.value)[number]) {
  return computeEffectiveVoucherStatus(v) === 'issued'
}
function isLocked(v: (typeof rows.value)[number]) {
  return v.verifyAttempts >= VERIFY_MAX_ATTEMPTS
}

function resend(v: (typeof rows.value)[number]) {
  const res = resendVoucherNotification(v.id)
  if (res.ok) toast.success('Notification resent', `Sent to ${v.customerEmail}`)
}

const voidTarget = ref<{ id: string; secretKey: string } | null>(null)
const voidReason = ref('')
const voidOpen = computed({ get: () => !!voidTarget.value, set: (v: boolean) => { if (!v) voidTarget.value = null } })
function askVoid(v: (typeof rows.value)[number]) {
  voidTarget.value = { id: v.id, secretKey: v.secretKey }
  voidReason.value = ''
}
function confirmVoid() {
  if (!voidTarget.value) return
  const res = voidVoucher(voidTarget.value.id, voidReason.value)
  if (res.ok) toast.warning('Voucher voided')
  else toast.error('Could not void', res.error)
  voidTarget.value = null
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Vouchers</h1>
      <p class="text-sm text-muted">{{ rows.length }} voucher{{ rows.length === 1 ? '' : 's' }} matching your filters.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <BaseSelect v-model="filters.status" placeholder="All statuses" :options="statusOptions" />
        <BaseSelect v-model="filters.currency" placeholder="All currencies" :options="currencyOptions" />
        <input v-model="filters.date" type="date" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </div>
      <button v-if="hasFilters" class="mt-3 text-xs font-semibold text-primary" @click="clearFilters">Clear filters</button>
    </BaseCard>

    <LoadingState v-if="pending" :rows="5" />
    <EmptyState v-else-if="!rows.length" icon="lucide:search-x" title="No matching vouchers" message="Try adjusting or clearing your filters." />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th class="px-5 py-3 font-semibold">Code</th>
              <th class="px-5 py-3 font-semibold">Customer</th>
              <th class="px-5 py-3 font-semibold">Secret key</th>
              <th class="px-5 py-3 font-semibold">Value</th>
              <th class="px-5 py-3 font-semibold">Status</th>
              <th class="px-5 py-3 font-semibold">Created</th>
              <th class="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="v in rows" :key="v.id" class="transition-colors hover:bg-black/[0.02]">
              <td class="px-5 py-3">
                <NuxtLink :to="`/admin/vouchers/${v.id}`" class="font-mono font-semibold text-ink hover:text-primary">{{ v.code }}</NuxtLink>
              </td>
              <td class="px-5 py-3 text-ink">{{ v.customerFullName }}</td>
              <td class="px-5 py-3 text-muted">{{ v.secretKey }}</td>
              <td class="px-5 py-3 font-semibold text-ink">{{ formatCurrency(v.amount, v.currency) }}</td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <StatusBadge :status="computeEffectiveVoucherStatus(v)" />
                  <Icon v-if="isLocked(v)" name="lucide:lock" class="size-3.5 text-error" title="Locked after too many failed verification attempts" />
                </div>
              </td>
              <td class="px-5 py-3 text-muted">{{ new Date(v.createdAt).toLocaleString() }}</td>
              <td class="px-5 py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <button class="text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:text-muted" :disabled="!canAct(v)" @click="resend(v)">Resend</button>
                  <button class="text-xs font-semibold text-error disabled:cursor-not-allowed disabled:text-muted" :disabled="!canVoid(v)" @click="askVoid(v)">Void</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="divide-y divide-border md:hidden">
        <li v-for="v in rows" :key="v.id" class="p-4">
          <div class="flex items-center justify-between">
            <NuxtLink :to="`/admin/vouchers/${v.id}`" class="font-mono font-bold text-ink">{{ v.code }}</NuxtLink>
            <div class="flex items-center gap-2">
              <StatusBadge :status="computeEffectiveVoucherStatus(v)" />
              <Icon v-if="isLocked(v)" name="lucide:lock" class="size-3.5 text-error" />
            </div>
          </div>
          <p class="mt-1.5 text-sm text-ink">{{ v.customerFullName }}</p>
          <p class="text-xs text-muted">{{ v.secretKey }} · {{ new Date(v.createdAt).toLocaleDateString() }}</p>
          <div class="mt-2 flex items-center justify-between">
            <span class="font-semibold text-ink">{{ formatCurrency(v.amount, v.currency) }}</span>
            <div class="flex gap-3">
              <button class="text-xs font-semibold text-primary disabled:text-muted" :disabled="!canAct(v)" @click="resend(v)">Resend</button>
              <button class="text-xs font-semibold text-error disabled:text-muted" :disabled="!canVoid(v)" @click="askVoid(v)">Void</button>
            </div>
          </div>
        </li>
      </ul>
    </BaseCard>

    <BaseModal v-model="voidOpen" title="Void this voucher?">
      <p class="text-sm text-muted">This permanently voids the voucher for <span class="font-semibold text-ink">{{ voidTarget?.secretKey }}</span>. They will not be able to use it.</p>
      <label class="mt-4 block">
        <span class="mb-1.5 block text-sm font-medium text-ink">Reason</span>
        <input v-model="voidReason" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. mistyped secret key" />
      </label>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="voidOpen = false">Cancel</BaseButton>
        <BaseButton variant="danger" block @click="confirmVoid">Void voucher</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
