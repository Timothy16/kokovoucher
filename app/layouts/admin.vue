<script setup lang="ts">
const { db, logout, dashboardSummary } = useMockDb()
const router = useRouter()

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
  { to: '/admin/generate', label: 'Generate voucher', icon: 'lucide:sparkles' },
  { to: '/admin/vouchers', label: 'Vouchers', icon: 'lucide:ticket' },
  { to: '/admin/restaurants', label: 'Restaurants', icon: 'lucide:store' }
]

function handleLogout() {
  logout()
  router.push('/admin/login')
}
</script>

<template>
  <DashboardShell
    brand="KokoVoucher Admin"
    :nav-items="navItems"
    :identity-label="db.admin.name"
    :identity-sub="db.admin.email"
    :badge="dashboardSummary.pendingRestaurants > 0 ? { tone: 'warning', label: `${dashboardSummary.pendingRestaurants} pending` } : undefined"
    @logout="handleLogout"
  >
    <slot />
  </DashboardShell>
</template>
