<!-- app/pages/admin/vouchers/[id].vue -->
<script setup lang="ts">
import { VERIFY_MAX_ATTEMPTS } from '#shared/types/models'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const supabase = useSupabase()
const id = route.params.id as string

const { data, pending, error, refresh } = useAsyncData(`admin-voucher-${id}`, async () => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const [voucher, events, orders, walkIn] = await Promise.all([
    supabase.from('vouchers').select().eq('id', id).maybeSingle(),
    supabase.from('voucher_events').select().eq('voucher_id', id).order('at').order('id'),
    supabase.from('orders').select('id, reference, status, created_at, restaurants(name)').eq('voucher_id', id).order('created_at', { ascending: false }),
    supabase.from('walk_ins').select('id, bill_amount, credited_amount, forfeited_amount, created_at, restaurants(name)').eq('voucher_id', id).maybeSingle()
  ])
  for (const r of [voucher, events, orders, walkIn]) if (r.error) throw r.error
  if (!voucher.data) return null
  return { voucher: voucher.data, events: events.data ?? [], orders: orders.data ?? [], walkIn: walkIn.data }
})

const voucher = computed(() => data.value?.voucher ?? null)
const status = computed(() => (voucher.value ? effectiveVoucherStatus(voucher.value) : null))
const locked = computed(() => !!voucher.value && isVoucherLocked(voucher.value))
const usable = computed(() => status.value === 'issued' || status.value === 'reserved')

const eventMeta: Record<string, { icon: string; label: string; tone: string }> = {
  issued: { icon: 'lucide:sparkles', label: 'Issued', tone: 'text-muted bg-black/5' },
  reserved: { icon: 'lucide:hourglass', label: 'Reserved for a delivery order', tone: 'text-warning bg-warning-soft' },
  released: { icon: 'lucide:rotate-ccw', label: 'Released — usable again', tone: 'text-primary bg-primary-soft' },
  redeemed_delivery: { icon: 'lucide:truck', label: 'Redeemed — delivery', tone: 'text-success bg-success-soft' },
  redeemed_walkin: { icon: 'lucide:footprints', label: 'Redeemed — walk-in', tone: 'text-success bg-success-soft' },
  expired: { icon: 'lucide:clock-alert', label: 'Expired', tone: 'text-error bg-error-soft' },
  voided: { icon: 'lucide:ban', label: 'Voided', tone: 'text-error bg-error-soft' }
}

const { busy, resend, voidTarget, voidReason, voidOpen, askVoid, confirmVoid } = useVoucherActions(refresh)
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <NuxtLink to="/admin/vouchers" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to vouchers
    </NuxtLink>

    <LoadingState v-if="pending && !data" :rows="4" />
    <ErrorState v-else-if="error" message="We couldn't load this voucher." @retry="refresh()" />
    <EmptyState v-else-if="!voucher || !data" icon="lucide:search-x" title="Voucher not found" />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-mono text-2xl font-bold tracking-widest text-ink">{{ voucher.code }}</p>
            <p class="mt-1 text-sm text-muted">{{ voucher.customer_full_name }} · {{ voucher.secret_key }}</p>
          </div>
          <div class="flex items-center gap-2">
            <Icon v-if="locked && usable" name="lucide:lock" class="size-4 text-error" />
            <StatusBadge :status="status!" />
          </div>
        </div>
        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
          <div><p class="text-xs text-muted">Value</p><p class="mt-0.5 font-bold text-ink">{{ formatCurrency(Number(voucher.amount), voucher.currency) }}</p></div>
          <div class="min-w-0"><p class="text-xs text-muted">Email</p><p class="mt-0.5 truncate font-semibold text-ink">{{ voucher.customer_email }}</p></div>
          <div><p class="text-xs text-muted">Phone</p><p class="mt-0.5 font-semibold text-ink">{{ voucher.customer_phone }}</p></div>
          <div><p class="text-xs text-muted">Expires</p><p class="mt-0.5 font-semibold text-ink">{{ new Date(voucher.expires_at).toLocaleString() }}</p></div>
        </div>

        <div v-if="data.walkIn" class="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm">
          <Icon name="lucide:footprints" class="mt-0.5 size-4 shrink-0 text-muted" />
          <span class="text-ink">
            Walk-in at <span class="font-semibold">{{ data.walkIn.restaurants?.name }}</span> — bill {{ formatCurrency(Number(data.walkIn.bill_amount), voucher.currency) }},
            credited {{ formatCurrency(Number(data.walkIn.credited_amount), voucher.currency) }}<template v-if="Number(data.walkIn.forfeited_amount) > 0">, {{ formatCurrency(Number(data.walkIn.forfeited_amount), voucher.currency) }} forfeited</template>.
          </span>
        </div>
        <div v-for="o in data.orders" :key="o.id" class="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4 text-sm">
          <span class="flex min-w-0 items-center gap-2 text-ink">
            <Icon name="lucide:truck" class="size-4 shrink-0 text-muted" />
            <span class="truncate">
              Order <NuxtLink :to="`/admin/orders/${o.id}`" class="font-mono font-semibold text-primary">{{ o.reference }}</NuxtLink>
              at <span class="font-semibold">{{ o.restaurants?.name }}</span>
            </span>
          </span>
          <StatusBadge :status="o.status" />
        </div>

        <div v-if="voucher.void_reason" class="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm">
          <Icon name="lucide:info" class="mt-0.5 size-4 shrink-0 text-muted" />
          <span class="text-ink">Void reason: {{ voucher.void_reason }}</span>
        </div>
        <div v-if="locked && usable" class="mt-4 flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-3 text-sm font-medium text-error">
          <Icon name="lucide:lock" class="mt-0.5 size-4 shrink-0" />
          <span>Locked after {{ voucher.verify_attempts }} incorrect code/secret-key attempts. The customer can't unlock it — void it and issue a new one if they need it.</span>
        </div>
        <div v-else-if="voucher.verify_attempts > 0 && usable" class="mt-4 text-xs text-muted">
          {{ voucher.verify_attempts }} of {{ VERIFY_MAX_ATTEMPTS }} incorrect verification attempts used.
        </div>

        <div v-if="usable" class="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
          <BaseButton size="sm" variant="secondary" :loading="busy === voucher.id && !voidOpen" @click="resend(voucher.id, voucher.customer_email)">
            <Icon name="lucide:send" class="size-4" />
            Resend email
          </BaseButton>
          <BaseButton v-if="status === 'issued'" size="sm" variant="danger" @click="askVoid(voucher)">
            <Icon name="lucide:ban" class="size-4" />
            Void
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard class="animate-fade-up">
        <p class="mb-5 font-bold text-ink">Audit trail</p>
        <ol class="relative space-y-6 border-l border-border pl-6">
          <li v-for="e in data.events" :key="e.id" class="relative">
            <span class="absolute -left-[31px] flex size-6 items-center justify-center rounded-full ring-4 ring-surface" :class="eventMeta[e.type]?.tone">
              <Icon :name="eventMeta[e.type]?.icon ?? 'lucide:dot'" class="size-3.5" />
            </span>
            <p class="text-sm font-semibold text-ink">{{ eventMeta[e.type]?.label ?? e.type }}</p>
            <p class="text-xs text-muted">{{ new Date(e.at).toLocaleString() }}<span v-if="e.note"> · {{ e.note }}</span></p>
          </li>
        </ol>
      </BaseCard>
    </template>

    <VoidVoucherModal v-model:open="voidOpen" v-model:reason="voidReason" :code="voidTarget?.code" :secret-key="voidTarget?.secretKey" :busy="!!busy" @confirm="confirmVoid" />
  </div>
</template>
