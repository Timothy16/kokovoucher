<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const { db, approveRestaurant, rejectRestaurant } = useMockDb()
const toast = useToast()

const restaurant = computed(() => db.value.restaurants.find((r) => r.id === route.params.id))
const vouchers = computed(() =>
  db.value.vouchers.filter((v) => v.restaurantId === route.params.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
)

function approve() {
  if (!restaurant.value) return
  approveRestaurant(restaurant.value.id)
  toast.success('Restaurant approved')
}
function reject() {
  if (!restaurant.value) return
  rejectRestaurant(restaurant.value.id)
  toast.warning('Restaurant rejected')
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <NuxtLink to="/admin/restaurants" class="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <Icon name="lucide:arrow-left" class="size-4" />
      Back to restaurants
    </NuxtLink>

    <EmptyState v-if="!restaurant" icon="lucide:search-x" title="Restaurant not found" />

    <template v-else>
      <BaseCard class="animate-fade-up">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-4">
            <Avatar :seed="restaurant.name" :size="52" />
            <div>
              <p class="text-xl font-bold text-ink">{{ restaurant.name }}</p>
              <p class="text-sm text-muted">{{ restaurant.email }}</p>
            </div>
          </div>
          <StatusBadge :status="restaurant.status" />
        </div>
        <div class="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5">
          <div>
            <p class="text-xs text-muted">Joined</p>
            <p class="mt-0.5 font-semibold text-ink">{{ new Date(restaurant.joinedAt).toLocaleDateString() }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Redemptions</p>
            <p class="mt-0.5 font-semibold text-ink">{{ restaurant.redemptions }}</p>
          </div>
        </div>
        <div v-if="restaurant.status === 'pending'" class="mt-5 flex gap-3 border-t border-border pt-5">
          <BaseButton block @click="approve"><Icon name="lucide:check" class="size-4" />Approve</BaseButton>
          <BaseButton variant="danger" block @click="reject"><Icon name="lucide:x" class="size-4" />Reject</BaseButton>
        </div>
      </BaseCard>

      <BaseCard :padded="false" class="animate-fade-up overflow-hidden">
        <div class="border-b border-border px-5 py-4">
          <p class="font-bold text-ink">Voucher history</p>
        </div>
        <EmptyState v-if="!vouchers.length" icon="lucide:ticket" title="No vouchers yet" />
        <ul v-else class="divide-y divide-border">
          <li v-for="v in vouchers" :key="v.id" class="flex items-center justify-between gap-3 px-5 py-3.5">
            <div class="min-w-0">
              <NuxtLink :to="`/admin/vouchers/${v.id}`" class="font-mono text-sm font-semibold text-ink hover:text-primary">{{ v.code }}</NuxtLink>
              <p class="truncate text-xs text-muted">{{ v.customerEmail }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-ink">{{ formatCurrency(v.amount, v.currency) }}</span>
              <StatusBadge :status="computeEffectiveStatus(v)" />
            </div>
          </li>
        </ul>
      </BaseCard>
    </template>
  </div>
</template>
