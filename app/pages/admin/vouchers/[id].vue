<!-- app/pages/admin/vouchers/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const { db, getVoucher, resendVoucherNotification, voidVoucher, VERIFY_MAX_ATTEMPTS } = useMockDb()
const toast = useToast()

const voucher = computed(() => getVoucher(route.params.id as string))
const order = computed(() => (voucher.value ? db.value.orders.find((o) => o.voucherId === voucher.value!.id) : null))
const walkIn = computed(() => (voucher.value ? db.value.walkIns.find((w) => w.voucherId === voucher.value!.id) : null))
const restaurant = computed(() => (order.value ? db.value.restaurants.find((r) => r.id === order.value!.restaurantId) : walkIn.value ? db.value.restaurants.find((r) => r.id === walkIn.value!.restaurantId) : null))

const eventMeta: Record<string, { icon: string; label: string; tone: string }> = {
  issued: { icon: 'lucide:sparkles', label: 'Issued', tone: 'text-muted bg-black/5' },
  reserved: { icon: 'lucide:hourglass', label: 'Reserved for delivery', tone: 'text-warning bg-warning-soft' },
  released: { icon: 'lucide:rotate-ccw', label: 'Released back to issued', tone: 'text-primary bg-primary-soft' },
  redeemed_delivery: { icon: 'lucide:truck', label: 'Redeemed — delivery', tone: 'text-success bg-success-soft' },
  redeemed_walkin: { icon: 'lucide:footprints', label: 'Redeemed — walk-in', tone: 'text-success bg-success-soft' },
  expired: { icon: 'lucide:clock-alert', label: 'Expired', tone: 'text-error bg-error-soft' },
  voided: { icon: 'lucide:ban', label: 'Voided', tone: 'text-error bg-error-soft' }
}

const status = computed(() => (voucher.value ? computeEffectiveVoucherStatus(voucher.value) : null))
const isLocked = computed(() => !!voucher.value && voucher.value.verifyAttempts >= VERIFY_MAX_ATTEMPTS)

function resend() {
  if (!voucher.value) return
  const res = resendVoucherNotification(voucher.value.id)
  if (res.ok) toast.success('Notification resent')
}

const voidOpen = ref(false)
const voidReason = ref('')
function confirmVoid() {
  if (!voucher.value) return
  const res = voidVoucher(voucher.value.id, voidReason.value)
  if (res.ok) toast.warning('Voucher voided')
  else toast.error('Could not void', res.error)
  voidOpen.value = false
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <NuxtLink to="/admin/vouchers" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to vouchers
    </NuxtLink>

    <EmptyState v-if="!voucher" icon="lucide:search-x" title="Voucher not found" />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-mono text-2xl font-bold tracking-widest text-ink">{{ voucher.code }}</p>
            <p class="mt-1 text-sm text-muted">{{ voucher.customerFullName }} · {{ voucher.secretKey }}</p>
          </div>
          <StatusBadge :status="status!" />
        </div>
        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
          <div><p class="text-xs text-muted">Value</p><p class="mt-0.5 font-bold text-ink">{{ formatCurrency(voucher.amount, voucher.currency) }}</p></div>
          <div><p class="text-xs text-muted">Email</p><p class="mt-0.5 truncate font-semibold text-ink">{{ voucher.customerEmail }}</p></div>
          <div><p class="text-xs text-muted">Phone</p><p class="mt-0.5 font-semibold text-ink">{{ voucher.customerPhone }}</p></div>
          <div><p class="text-xs text-muted">Expires</p><p class="mt-0.5 font-semibold text-ink">{{ new Date(voucher.expiresAt).toLocaleString() }}</p></div>
        </div>
        <div v-if="restaurant" class="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm">
          <Icon name="lucide:store" class="size-4 text-muted" />
          <span class="text-ink">
            Redeemed at <span class="font-semibold">{{ restaurant.name }}</span> via {{ voucher.redeemMethod === 'walk_in' ? 'walk-in' : 'delivery' }}
            <template v-if="order">
              — order <NuxtLink :to="`/admin/orders/${order.id}`" class="font-mono font-semibold text-primary">{{ order.reference }}</NuxtLink>
            </template>
          </span>
        </div>
        <div v-if="voucher.voidReason" class="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm">
          <Icon name="lucide:info" class="mt-0.5 size-4 text-muted" />
          <span class="text-ink">Void reason: {{ voucher.voidReason }}</span>
        </div>
        <div v-if="isLocked && (status === 'issued' || status === 'reserved')" class="mt-4 flex items-start gap-2 rounded-control bg-error-soft px-3.5 py-3 text-sm font-medium text-error">
          <Icon name="lucide:lock" class="mt-0.5 size-4 shrink-0" />
          <span>Locked out after {{ voucher.verifyAttempts }} incorrect code/secret-key attempts. The customer can't self-recover — void this and issue a new one if they need it.</span>
        </div>
        <div v-else-if="voucher.verifyAttempts > 0 && (status === 'issued' || status === 'reserved')" class="mt-4 text-xs text-muted">
          {{ voucher.verifyAttempts }} of {{ VERIFY_MAX_ATTEMPTS }} verification attempts used.
        </div>
        <div v-if="status === 'issued' || status === 'reserved'" class="mt-5 flex gap-3 border-t border-border pt-5">
          <BaseButton size="sm" variant="secondary" @click="resend"><Icon name="lucide:send" class="size-4" />Resend notification</BaseButton>
          <BaseButton v-if="status === 'issued'" size="sm" variant="danger" @click="voidOpen = true"><Icon name="lucide:ban" class="size-4" />Void</BaseButton>
        </div>
      </BaseCard>

      <BaseCard class="animate-fade-up">
        <p class="mb-5 font-bold text-ink">Audit trail</p>
        <ol class="relative space-y-6 border-l border-border pl-6">
          <li v-for="(e, i) in voucher.events" :key="i" class="relative">
            <span class="absolute -left-[31px] flex size-6 items-center justify-center rounded-full ring-4 ring-surface" :class="eventMeta[e.type]?.tone">
              <Icon :name="eventMeta[e.type]?.icon ?? 'lucide:dot'" class="size-3.5" />
            </span>
            <p class="text-sm font-semibold text-ink">{{ eventMeta[e.type]?.label ?? e.type }}</p>
            <p class="text-xs text-muted">{{ new Date(e.at).toLocaleString() }}<span v-if="e.note"> · {{ e.note }}</span></p>
          </li>
        </ol>
      </BaseCard>
    </template>

    <BaseModal v-model="voidOpen" title="Void this voucher?">
      <p class="text-sm text-muted">This permanently voids the voucher. It cannot be undone.</p>
      <label class="mt-4 block">
        <span class="mb-1.5 block text-sm font-medium text-ink">Reason</span>
        <input v-model="voidReason" class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </label>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="voidOpen = false">Cancel</BaseButton>
        <BaseButton variant="danger" block @click="confirmVoid">Void voucher</BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
