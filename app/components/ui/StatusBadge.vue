<!-- app/components/ui/StatusBadge.vue -->
<script setup lang="ts">
const props = defineProps<{ status: string }>()

const map: Record<string, { tone: 'muted' | 'primary' | 'success' | 'error' | 'warning'; label: string }> = {
  // voucher
  issued: { tone: 'muted', label: 'Issued' },
  reserved: { tone: 'warning', label: 'Reserved' },
  redeemed: { tone: 'success', label: 'Redeemed' },
  expired: { tone: 'error', label: 'Expired' },
  void: { tone: 'muted', label: 'Void' },
  // restaurant
  invited: { tone: 'warning', label: 'Invited' },
  active: { tone: 'success', label: 'Active' },
  disabled: { tone: 'muted', label: 'Disabled' },
  // delivery order
  placed: { tone: 'warning', label: 'Placed' },
  received: { tone: 'primary', label: 'Received' },
  dispatched: { tone: 'primary', label: 'Dispatched' },
  delivered: { tone: 'success', label: 'Delivered' },
  cancelled: { tone: 'error', label: 'Cancelled' },
  rejected: { tone: 'error', label: 'Rejected' },
  // payout item
  pending: { tone: 'warning', label: 'Pending' },
  paid: { tone: 'success', label: 'Paid' },
  revoked: { tone: 'error', label: 'Revoked' }
}

const pulseStatuses = new Set(['reserved', 'invited', 'placed', 'received', 'dispatched', 'pending'])
const entry = computed(() => map[props.status] ?? { tone: 'muted' as const, label: props.status })
</script>

<template>
  <BaseBadge :tone="entry.tone" :pulse="pulseStatuses.has(status)">{{ entry.label }}</BaseBadge>
</template>
