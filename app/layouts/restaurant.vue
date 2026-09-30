<!-- app/layouts/restaurant.vue -->
<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'

const auth = useAuth()
const supabase = useSupabase()
const router = useRouter()
const route = useRoute()
const toast = useToast()

// Bumped on every change to this restaurant's orders; order pages refetch when it changes.
const ordersRevision = useRestaurantOrdersRevision()
const newOrders = ref(0)
const balance = ref(0)

const navItems = computed(() => [
  { to: '/restaurant', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
  { to: '/restaurant/menu', label: 'Menu', icon: 'lucide:utensils-crossed' },
  { to: '/restaurant/orders', label: 'Orders', icon: 'lucide:package', count: newOrders.value },
  { to: '/restaurant/walk-in', label: 'Walk-in redeem', icon: 'lucide:ticket-check' },
  { to: '/restaurant/wallet', label: 'Wallet', icon: 'lucide:wallet' },
  { to: '/restaurant/settings', label: 'Settings', icon: 'lucide:settings' }
])

// RLS limits both queries (and the realtime feed) to this restaurant's own rows.
async function refreshCounts() {
  const [placed, wallet] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'placed'),
    supabase.from('restaurant_wallets').select('pending_balance').maybeSingle()
  ])
  newOrders.value = placed.count ?? 0
  balance.value = Number(wallet.data?.pending_balance ?? 0)
}
watch([() => route.path, ordersRevision], refreshCounts, { immediate: true })

// Live inbox: new orders appear without a refresh (Supabase Realtime on `orders`).
let channel: RealtimeChannel | null = null
watch(
  () => auth.restaurant.value?.id,
  (id) => {
    if (channel) supabase.removeChannel(channel)
    channel = null
    if (!id) return
    channel = supabase
      .channel(`restaurant-orders-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${id}` }, (payload) => {
        if (payload.eventType === 'INSERT') toast.success('New order', `${(payload.new as { reference?: string }).reference ?? 'A new order'} just came in.`)
        ordersRevision.value++
      })
      .subscribe()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
})

async function handleLogout() {
  await auth.signOut()
  router.push('/restaurant/login')
}
</script>

<template>
  <DashboardShell
    brand="KokoSend"
    :nav-items="navItems"
    :identity-label="auth.restaurant.value?.name ?? ''"
    identity-sub="Restaurant partner"
    :badge="balance > 0 && auth.restaurant.value ? { tone: 'success', label: formatCurrency(balance, auth.restaurant.value.currency) } : undefined"
    @logout="handleLogout"
  >
    <slot />
  </DashboardShell>
</template>
