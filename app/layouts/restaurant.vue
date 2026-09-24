<!-- app/layouts/restaurant.vue -->
<script setup lang="ts">
const { currentRestaurant, logout, pendingBalance } = useMockDb()
const router = useRouter()

const navItems = [
  { to: '/restaurant', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
  { to: '/restaurant/menu', label: 'Menu', icon: 'lucide:utensils-crossed' },
  { to: '/restaurant/orders', label: 'Orders', icon: 'lucide:package' },
  { to: '/restaurant/walk-in', label: 'Walk-in redeem', icon: 'lucide:qr-code' },
  { to: '/restaurant/wallet', label: 'Wallet', icon: 'lucide:wallet' },
  { to: '/restaurant/settings', label: 'Settings', icon: 'lucide:settings' }
]

const balance = computed(() => (currentRestaurant.value ? pendingBalance(currentRestaurant.value.id) : 0))

function handleLogout() {
  logout()
  router.push('/restaurant/login')
}
</script>

<template>
  <DashboardShell
    brand="KokoVoucher"
    :nav-items="navItems"
    :identity-label="currentRestaurant?.name ?? ''"
    identity-sub="Restaurant partner"
    :badge="balance > 0 && currentRestaurant ? { tone: 'success', label: formatCurrency(balance, currentRestaurant.currency) } : undefined"
    @logout="handleLogout"
  >
    <slot />
  </DashboardShell>
</template>
