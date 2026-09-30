<!-- app/pages/admin/audit-log/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()
const PAGE_SIZE = 200

const areaOptions = [
  { value: 'voucher', label: 'Vouchers' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'combo', label: 'Menu' },
  { value: 'order', label: 'Orders' },
  { value: 'payout', label: 'Payouts' },
  { value: 'settings', label: 'Settings' }
]
const area = ref('')

const { data: rows, pending, error, refresh } = useAsyncData(
  'admin-audit-log',
  async () => {
    let q = supabase.from('audit_log').select().order('at', { ascending: false }).limit(PAGE_SIZE)
    if (area.value) q = q.like('action', `${area.value}.%`)
    const { data, error } = await q
    if (error) throw error
    return data
  },
  { watch: [area] }
)

const actionMeta: Record<string, { icon: string; label: string }> = {
  'voucher.issue': { icon: 'lucide:sparkles', label: 'Voucher issued' },
  'voucher.void': { icon: 'lucide:ban', label: 'Voucher voided' },
  'voucher.resend': { icon: 'lucide:send', label: 'Voucher email resent' },
  'restaurant.create': { icon: 'lucide:store', label: 'Restaurant added and invited' },
  'restaurant.update': { icon: 'lucide:pencil', label: 'Restaurant edited' },
  'restaurant.invite_resend': { icon: 'lucide:send', label: 'Invite resent' },
  'restaurant.invite_accept': { icon: 'lucide:check', label: 'Invite accepted' },
  'restaurant.disable': { icon: 'lucide:ban', label: 'Restaurant disabled' },
  'restaurant.enable': { icon: 'lucide:check', label: 'Restaurant re-enabled' },
  'combo.create': { icon: 'lucide:plus', label: 'Combo added' },
  'combo.update': { icon: 'lucide:pencil', label: 'Combo edited' },
  'order.dispute_resolve': { icon: 'lucide:flag', label: 'Dispute resolved' },
  'payout.process': { icon: 'lucide:banknote', label: 'Payout processed' },
  'payout.revoke': { icon: 'lucide:undo-2', label: 'Credit revoked' },
  'settings.update': { icon: 'lucide:settings', label: 'Settings changed' }
}

/** Where a log entry's target lives in the admin, when it has a page. */
function targetLink(type: string, id: string) {
  if (type === 'voucher') return `/admin/vouchers/${id}`
  if (type === 'restaurant') return `/admin/restaurants/${id}`
  if (type === 'order') return `/admin/orders/${id}`
  return null
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Audit log</h1>
      <p class="text-sm text-muted">Every sensitive action, newest first. Entries can't be edited or deleted from the app.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <BaseSelect v-model="area" placeholder="All areas" :options="areaOptions" class="sm:max-w-xs" />
    </BaseCard>

    <LoadingState v-if="pending && !rows" :rows="5" />
    <ErrorState v-else-if="error" message="We couldn't load the audit log." @retry="refresh()" />
    <EmptyState v-else-if="!rows?.length" icon="lucide:history" title="No activity yet" />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <ul class="divide-y divide-border">
        <li v-for="a in rows" :key="a.id" class="flex items-start gap-3 px-5 py-4">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink">
            <Icon :name="actionMeta[a.action]?.icon ?? 'lucide:dot'" class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-ink">
              <NuxtLink v-if="targetLink(a.target_type, a.target_id)" :to="targetLink(a.target_type, a.target_id)!" class="hover:text-primary">{{ actionMeta[a.action]?.label ?? a.action }}</NuxtLink>
              <template v-else>{{ actionMeta[a.action]?.label ?? a.action }}</template>
            </p>
            <p class="break-words text-sm text-muted">by {{ a.actor }}<span v-if="a.note"> · {{ a.note }}</span></p>
          </div>
          <span class="shrink-0 text-xs text-muted">{{ new Date(a.at).toLocaleString() }}</span>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
