<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const { getVoucher } = useMockDb()
const voucher = computed(() => getVoucher(route.params.id as string))

const eventMeta: Record<string, { icon: string; label: string; tone: string }> = {
  issued: { icon: 'lucide:sparkles', label: 'Issued', tone: 'text-muted bg-black/5' },
  delivered: { icon: 'lucide:send', label: 'Delivered', tone: 'text-primary bg-primary-soft' },
  activated: { icon: 'lucide:zap', label: 'Activated', tone: 'text-primary bg-primary-soft' },
  redeemed: { icon: 'lucide:check', label: 'Redeemed', tone: 'text-success bg-success-soft' },
  expired: { icon: 'lucide:clock-alert', label: 'Expired', tone: 'text-error bg-error-soft' }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <NuxtLink to="/admin/vouchers" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to vouchers
    </NuxtLink>

    <EmptyState v-if="!voucher" icon="lucide:search-x" title="Voucher not found" message="It may have been removed or the link is incorrect." />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-mono text-2xl font-bold tracking-widest text-ink">{{ voucher.code }}</p>
            <p class="mt-1 text-sm text-muted">{{ voucher.restaurantName }}</p>
          </div>
          <StatusBadge :status="computeEffectiveStatus(voucher)" />
        </div>
        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
          <div>
            <p class="text-xs text-muted">Value</p>
            <p class="mt-0.5 font-bold text-ink">{{ formatCurrency(voucher.amount, voucher.currency) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Customer</p>
            <p class="mt-0.5 truncate font-semibold text-ink">{{ voucher.customerEmail }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Phone</p>
            <p class="mt-0.5 font-semibold text-ink">{{ voucher.customerPhone }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Expires</p>
            <p class="mt-0.5 font-semibold text-ink">{{ new Date(voucher.expiresAt).toLocaleString() }}</p>
          </div>
        </div>
      </BaseCard>

      <BaseCard class="animate-fade-up">
        <p class="mb-5 font-bold text-ink">Audit trail</p>
        <ol class="relative space-y-6 border-l border-border pl-6">
          <li v-for="(e, i) in voucher.events" :key="i" class="relative">
            <span
              class="absolute -left-[31px] flex size-6 items-center justify-center rounded-full ring-4 ring-surface"
              :class="eventMeta[e.type]?.tone"
            >
              <Icon :name="eventMeta[e.type]?.icon ?? 'lucide:dot'" class="size-3.5" />
            </span>
            <p class="text-sm font-semibold text-ink">{{ eventMeta[e.type]?.label ?? e.type }}</p>
            <p class="text-xs text-muted">{{ new Date(e.at).toLocaleString() }}<span v-if="e.note"> · {{ e.note }}</span></p>
          </li>
        </ol>
      </BaseCard>
    </template>
  </div>
</template>
