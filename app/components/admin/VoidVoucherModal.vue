<!-- app/components/admin/VoidVoucherModal.vue -->
<script setup lang="ts">
defineProps<{ code?: string; secretKey?: string; busy: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const reason = defineModel<string>('reason', { required: true })
defineEmits<{ confirm: [] }>()
</script>

<template>
  <BaseModal v-model="open" title="Void this voucher?">
    <p class="text-sm text-muted">
      Voucher <span class="font-mono font-semibold text-ink">{{ code }}</span> for
      <span class="font-semibold text-ink">{{ secretKey }}</span> will stop working immediately. This can't be undone — the customer is emailed.
    </p>
    <label class="mt-4 block">
      <span class="mb-1.5 block text-sm font-medium text-ink">Reason (shared with the customer)</span>
      <input
        v-model="reason"
        maxlength="300"
        class="w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        placeholder="e.g. issued with a mistyped username"
      />
    </label>
    <div class="mt-5 flex gap-3">
      <BaseButton variant="secondary" block :disabled="busy" @click="open = false">Cancel</BaseButton>
      <BaseButton variant="danger" block :loading="busy" @click="$emit('confirm')">Void voucher</BaseButton>
    </div>
  </BaseModal>
</template>
