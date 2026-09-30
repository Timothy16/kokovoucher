<!-- app/pages/admin/notifications/index.vue -->
<script setup lang="ts">
import type { Notification } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const supabase = useSupabase()
const PAGE_SIZE = 200

const filters = reactive({ channel: '', recipientType: '', status: '' })
const channelOptions = [{ value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }]
const recipientOptions = [{ value: 'customer', label: 'Customer' }, { value: 'restaurant', label: 'Restaurant' }, { value: 'admin', label: 'Admin' }]
const statusOptions = [{ value: 'sent', label: 'Sent' }, { value: 'failed', label: 'Failed' }, { value: 'skipped', label: 'Skipped (not wired yet)' }, { value: 'queued', label: 'Queued' }]

const { data: rows, pending, error, refresh } = useAsyncData(
  'admin-notifications',
  async () => {
    let q = supabase.from('notifications').select().order('created_at', { ascending: false }).limit(PAGE_SIZE)
    if (filters.channel) q = q.eq('channel', filters.channel as Notification['channel'])
    if (filters.recipientType) q = q.eq('recipient_type', filters.recipientType as Notification['recipient_type'])
    if (filters.status) q = q.eq('status', filters.status as Notification['status'])
    const { data, error } = await q
    if (error) throw error
    return data
  },
  { watch: [() => ({ ...filters })] }
)

const channelIcon: Record<Notification['channel'], string> = { email: 'lucide:mail', whatsapp: 'lucide:message-circle' }
const statusTone: Record<Notification['status'], 'success' | 'error' | 'muted' | 'warning'> = { sent: 'success', failed: 'error', skipped: 'muted', queued: 'warning' }
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Notification log</h1>
      <p class="text-sm text-muted">Every email and WhatsApp message, with its delivery status. Emails go out through Resend; WhatsApp isn't connected yet, so those are logged as skipped.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BaseSelect v-model="filters.channel" placeholder="All channels" :options="channelOptions" />
        <BaseSelect v-model="filters.recipientType" placeholder="All recipients" :options="recipientOptions" />
        <BaseSelect v-model="filters.status" placeholder="All statuses" :options="statusOptions" />
      </div>
    </BaseCard>

    <LoadingState v-if="pending && !rows" :rows="5" />
    <ErrorState v-else-if="error" message="We couldn't load the notification log." @retry="refresh()" />
    <EmptyState v-else-if="!rows?.length" icon="lucide:bell-off" title="No notifications match" />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <ul class="divide-y divide-border">
        <li v-for="n in rows" :key="n.id" class="flex items-start gap-3 px-5 py-4">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon :name="channelIcon[n.channel]" class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-ink">{{ n.subject }}</p>
              <BaseBadge :tone="statusTone[n.status]">{{ n.status }}</BaseBadge>
              <BaseBadge tone="muted">{{ n.recipient_type }}</BaseBadge>
            </div>
            <p class="mt-0.5 truncate text-sm text-muted">To {{ n.recipient }}</p>
            <p class="mt-1 text-sm text-ink">{{ n.summary }}</p>
            <p v-if="n.status === 'failed' && n.error" class="mt-1 text-xs font-medium text-error">{{ n.error }}</p>
          </div>
          <span class="shrink-0 text-xs text-muted">{{ new Date(n.created_at).toLocaleString() }}</span>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
