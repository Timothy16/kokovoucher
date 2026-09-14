<script setup lang="ts">
const props = defineProps<{ status: string }>()

const map: Record<string, { tone: 'muted' | 'primary' | 'success' | 'error' | 'warning'; label: string }> = {
  issued: { tone: 'muted', label: 'Issued' },
  active: { tone: 'primary', label: 'Active' },
  redeemed: { tone: 'success', label: 'Redeemed' },
  expired: { tone: 'error', label: 'Expired' },
  pending: { tone: 'warning', label: 'Pending' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'error', label: 'Rejected' }
}

const entry = computed(() => map[props.status] ?? { tone: 'muted' as const, label: props.status })
</script>

<template>
  <BaseBadge :tone="entry.tone" :pulse="status === 'active' || status === 'pending'">{{ entry.label }}</BaseBadge>
</template>
