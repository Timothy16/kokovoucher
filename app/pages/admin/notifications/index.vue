<!-- app/pages/admin/notifications/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db } = useMockDb()

const filters = reactive({ channel: '', recipientType: '' })
const channelOptions = [{ value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }]
const recipientOptions = [{ value: 'customer', label: 'Customer' }, { value: 'restaurant', label: 'Restaurant' }, { value: 'admin', label: 'Admin' }]

const rows = computed(() =>
  [...db.value.notifications]
    .sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt))
    .filter((n) => (!filters.channel || n.channel === filters.channel) && (!filters.recipientType || n.recipientType === filters.recipientType))
)

const channelIcon: Record<string, string> = { email: 'lucide:mail', whatsapp: 'lucide:message-circle' }
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Notification log</h1>
      <p class="text-sm text-muted">Every email and WhatsApp send in this demo, mocked — nothing actually leaves the app.</p>
    </div>

    <BaseCard class="animate-fade-up">
      <div class="grid grid-cols-2 gap-3 sm:max-w-md">
        <BaseSelect v-model="filters.channel" placeholder="All channels" :options="channelOptions" />
        <BaseSelect v-model="filters.recipientType" placeholder="All recipients" :options="recipientOptions" />
      </div>
    </BaseCard>

    <EmptyState v-if="!rows.length" icon="lucide:bell-off" title="No notifications match" />

    <BaseCard v-else :padded="false" class="animate-fade-up overflow-hidden">
      <ul class="divide-y divide-border">
        <li v-for="n in rows" :key="n.id" class="flex items-start gap-3 px-5 py-4">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon :name="channelIcon[n.channel]" class="size-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-ink">{{ n.subject }}</p>
              <BaseBadge tone="muted">{{ n.recipientType }}</BaseBadge>
            </div>
            <p class="mt-0.5 truncate text-sm text-muted">To {{ n.recipient }}</p>
            <p class="mt-1 text-sm text-ink">{{ n.summary }}</p>
          </div>
          <span class="shrink-0 text-xs text-muted">{{ new Date(n.sentAt).toLocaleString() }}</span>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
