<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { db, approveRestaurant, rejectRestaurant } = useMockDb()
const toast = useToast()

const pending = ref(true)
onMounted(() => setTimeout(() => (pending.value = false), 400))

const rows = computed(() => [...db.value.restaurants].sort((a, b) => (a.status === 'pending' ? -1 : 1)))

const confirmTarget = ref<{ id: string; name: string; action: 'approve' | 'reject' } | null>(null)
const confirmOpen = computed({
  get: () => !!confirmTarget.value,
  set: (v: boolean) => {
    if (!v) confirmTarget.value = null
  }
})

function ask(id: string, name: string, action: 'approve' | 'reject') {
  confirmTarget.value = { id, name, action }
}

function confirmAction() {
  if (!confirmTarget.value) return
  const { id, name, action } = confirmTarget.value
  if (action === 'approve') {
    approveRestaurant(id)
    toast.success('Restaurant approved', `${name} can now log in and redeem vouchers.`)
  } else {
    rejectRestaurant(id)
    toast.warning('Restaurant rejected', `${name} will not be able to log in.`)
  }
  confirmTarget.value = null
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Restaurants</h1>
      <p class="text-sm text-muted">Approve partners so they can start redeeming vouchers.</p>
    </div>

    <LoadingState v-if="pending" :rows="4" />
    <EmptyState v-else-if="!rows.length" icon="lucide:store" title="No restaurants yet" />

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard v-for="r in rows" :key="r.id" hover class="animate-fade-up">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <Avatar :seed="r.name" :size="42" />
            <div>
              <NuxtLink :to="`/admin/restaurants/${r.id}`" class="font-bold text-ink hover:text-primary">{{ r.name }}</NuxtLink>
              <p class="text-xs text-muted">{{ r.email }}</p>
            </div>
          </div>
          <StatusBadge :status="r.status" />
        </div>
        <div class="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span class="text-muted">{{ r.redemptions }} redemptions</span>
          <span class="text-muted">Joined {{ new Date(r.joinedAt).toLocaleDateString() }}</span>
        </div>
        <div v-if="r.status === 'pending'" class="mt-4 flex gap-2">
          <BaseButton size="sm" block @click="ask(r.id, r.name, 'approve')">
            <Icon name="lucide:check" class="size-4" />
            Approve
          </BaseButton>
          <BaseButton size="sm" variant="danger" block @click="ask(r.id, r.name, 'reject')">
            <Icon name="lucide:x" class="size-4" />
            Reject
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <BaseModal v-model="confirmOpen" :title="confirmTarget?.action === 'approve' ? 'Approve restaurant?' : 'Reject restaurant?'">
      <p class="text-sm text-muted">
        {{ confirmTarget?.action === 'approve' ? `${confirmTarget?.name} will be able to log in and redeem vouchers immediately.` : `${confirmTarget?.name} will not be able to log in or redeem vouchers.` }}
      </p>
      <div class="mt-5 flex gap-3">
        <BaseButton variant="secondary" block @click="confirmOpen = false">Cancel</BaseButton>
        <BaseButton :variant="confirmTarget?.action === 'approve' ? 'primary' : 'danger'" block @click="confirmAction">
          {{ confirmTarget?.action === 'approve' ? 'Approve' : 'Reject' }}
        </BaseButton>
      </div>
    </BaseModal>
  </div>
</template>
