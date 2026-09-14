<script setup lang="ts">
const { currentRestaurant, logout } = useMockDb()
const router = useRouter()

const navItems = [
  { to: '/restaurant/redeem', label: 'Redeem', icon: 'lucide:qr-code' },
  { to: '/restaurant/history', label: 'History', icon: 'lucide:rotate-ccw-clock' },
  { to: '/restaurant/settings', label: 'Settings', icon: 'lucide:settings' }
]

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
    @logout="handleLogout"
  >
    <slot />
  </DashboardShell>
</template>
