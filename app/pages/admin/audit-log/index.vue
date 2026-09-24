<!-- app/pages/admin/audit-log/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db } = useMockDb()

const rows = computed(() => [...db.value.auditLog].sort((a, b) => +new Date(b.at) - +new Date(a.at)))

const actionIcon: Record<string, string> = {
  'voucher.issue': 'lucide:sparkles',
  'voucher.void': 'lucide:ban',
  'voucher.resend': 'lucide:send',
  'restaurant.create': 'lucide:store',
  'restaurant.update': 'lucide:pencil',
  'restaurant.invite_resend': 'lucide:send',
  'restaurant.invite_accept': 'lucide:check',
  'restaurant.disable': 'lucide:ban',
  'restaurant.enable': 'lucide:check',
  'combo.create': 'lucide:plus',
  'combo.update': 'lucide:pencil',
  'payout.process': 'lucide:banknote',
  'payout.revoke': 'lucide:undo-2'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Audit log</h1>
      <p class="text-sm text-muted">Every sensitive action taken in this admin, in order.</p>
    </div>

    <EmptyState v-if="!rows.length" icon="lucide:history" title="No activity yet" />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <ul class="divide-y divide-border">
        <li v-for="a in rows" :key="a.id" class="flex items-start gap-3 px-5 py-4">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink">
            <Icon :name="actionIcon[a.action] ?? 'lucide:dot'" class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-ink">{{ a.action }}</p>
            <p class="text-sm text-muted">by {{ a.actor }} · {{ a.targetType }} {{ a.targetId }}<span v-if="a.note"> · {{ a.note }}</span></p>
          </div>
          <span class="shrink-0 text-xs text-muted">{{ new Date(a.at).toLocaleString() }}</span>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
