<!-- app/pages/admin/vouchers/index.vue -->
<script setup lang="ts">
import type { Voucher } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()

const PAGE_SIZE = 200
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

const { data: rows, pending, error, refresh } = useAsyncData(
  'admin-vouchers',
  async () => {
    let q = supabase.from('vouchers').select().order('created_at', { ascending: false }).limit(PAGE_SIZE)
    const nowIso = new Date().toISOString()
    // "Issued"/"Expired" follow effectiveVoucherStatus(): an issued voucher past its window is expired.
    if (filters.status === 'issued') q = q.eq('status', 'issued').gte('expires_at', nowIso)
    else if (filters.status === 'expired') q = q.or(`status.eq.expired,and(status.eq.issued,expires_at.lt.${nowIso})`)
    else if (filters.status) q = q.eq('status', filters.status as Voucher['status'])
    if (filters.currency) q = q.eq('currency', filters.currency as Voucher['currency'])
    if (filters.date) {
      // The picked day in the admin's own timezone.
      const start = new Date(`${filters.date}T00:00:00`)
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
    }
    const { data, error } = await q
    if (error) throw error
    return data
  },
  { watch: [() => ({ ...filters })] }
)

const hasFilters = computed(() => !!(filters.status || filters.currency || filters.date))
function clearFilters() {
  Object.assign(filters, { status: '', currency: '', date: '' })
}

const canResend = (v: Voucher) => ['issued', 'reserved'].includes(effectiveVoucherStatus(v))
const canVoid = (v: Voucher) => effectiveVoucherStatus(v) === 'issued'

const { busy, resend, voidTarget, voidReason, voidOpen, askVoid, confirmVoid } = useVoucherActions(refresh)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-ink">Vouchers</h1>
        <p class="text-sm text-muted">
          <template v-if="rows">{{ rows.length }}{{ rows.length === PAGE_SIZE ? '+' : '' }} voucher{{ rows.length === 1 ? '' : 's' }}{{ hasFilters ? ' matching your filters' : '' }}.</template>
          <template v-if="rows && rows.length === PAGE_SIZE"> Showing the newest {{ PAGE_SIZE }} — narrow with filters.</template>
        </p>
      </div>
      <BaseButton @click="navigateTo('/admin/generate')">
        <Icon name="lucide:sparkles" class="size-4" />
        Generate voucher
      </BaseButton>
    </div>

    <BaseCard class="animate-fade-up">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <BaseSelect v-model="filters.status" placeholder="All statuses" :options="statusOptions" />
        <BaseSelect v-model="filters.currency" placeholder="All currencies" :options="currencyOptions" />
        <input v-model="filters.date" type="date" aria-label="Created on" class="col-span-2 w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:col-span-1" />
      </div>
      <button v-if="hasFilters" class="mt-3 text-xs font-semibold text-primary" @click="clearFilters">Clear filters</button>
    </BaseCard>

    <LoadingState v-if="pending && !rows" :rows="5" />
    <ErrorState v-else-if="error" message="We couldn't load vouchers." @retry="refresh()" />
    <EmptyState v-else-if="!rows?.length && !hasFilters" icon="lucide:ticket" title="No vouchers yet" message="Issued vouchers will show up here.">
      <BaseButton size="sm" @click="navigateTo('/admin/generate')">Generate the first voucher</BaseButton>
    </EmptyState>
    <EmptyState v-else-if="!rows?.length" icon="lucide:search-x" title="No matching vouchers" message="Try adjusting or clearing your filters." />

    <BaseCard v-else-if="rows" :padded="false" class="animate-fade-up overflow-hidden">
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
              <th class="px-5 py-3 font-semibold">Expires</th>
              <th class="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="v in rows" :key="v.id" class="transition-colors hover:bg-black/[0.02]">
              <td class="px-5 py-3">
                <NuxtLink :to="`/admin/vouchers/${v.id}`" class="font-mono font-semibold text-ink hover:text-primary">{{ v.code }}</NuxtLink>
              </td>
              <td class="px-5 py-3 text-ink">{{ v.customer_full_name }}</td>
              <td class="px-5 py-3 text-muted">{{ v.secret_key }}</td>
              <td class="px-5 py-3 font-semibold text-ink">{{ formatCurrency(Number(v.amount), v.currency) }}</td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <StatusBadge :status="effectiveVoucherStatus(v)" />
                  <Icon v-if="isVoucherLocked(v)" name="lucide:lock" class="size-3.5 text-error" title="Locked after too many failed verification attempts" />
                </div>
              </td>
              <td class="whitespace-nowrap px-5 py-3 text-muted">{{ new Date(v.created_at).toLocaleString() }}</td>
              <td class="whitespace-nowrap px-5 py-3 text-muted">{{ new Date(v.expires_at).toLocaleString() }}</td>
              <td class="px-5 py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <button class="text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:text-muted" :disabled="!canResend(v) || !!busy" @click="resend(v.id, v.customer_email)">Resend</button>
                  <button class="text-xs font-semibold text-error disabled:cursor-not-allowed disabled:text-muted" :disabled="!canVoid(v) || !!busy" @click="askVoid(v)">Void</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="divide-y divide-border md:hidden">
        <li v-for="v in rows" :key="v.id" class="p-4">
          <div class="flex items-center justify-between gap-2">
            <NuxtLink :to="`/admin/vouchers/${v.id}`" class="font-mono font-bold text-ink">{{ v.code }}</NuxtLink>
            <div class="flex items-center gap-2">
              <StatusBadge :status="effectiveVoucherStatus(v)" />
              <Icon v-if="isVoucherLocked(v)" name="lucide:lock" class="size-3.5 text-error" />
            </div>
          </div>
          <p class="mt-1.5 text-sm text-ink">{{ v.customer_full_name }}</p>
          <p class="text-xs text-muted">{{ v.secret_key }} · expires {{ new Date(v.expires_at).toLocaleDateString() }}</p>
          <div class="mt-2 flex items-center justify-between">
            <span class="font-semibold text-ink">{{ formatCurrency(Number(v.amount), v.currency) }}</span>
            <div class="flex gap-4">
              <button class="py-1 text-xs font-semibold text-primary disabled:text-muted" :disabled="!canResend(v) || !!busy" @click="resend(v.id, v.customer_email)">Resend</button>
              <button class="py-1 text-xs font-semibold text-error disabled:text-muted" :disabled="!canVoid(v) || !!busy" @click="askVoid(v)">Void</button>
            </div>
          </div>
        </li>
      </ul>
    </BaseCard>

    <VoidVoucherModal v-model:open="voidOpen" v-model:reason="voidReason" :code="voidTarget?.code" :secret-key="voidTarget?.secretKey" :busy="!!busy" @confirm="confirmVoid" />
  </div>
</template>
