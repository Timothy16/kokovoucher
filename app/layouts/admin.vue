<!-- app/layouts/admin.vue -->
<script setup lang="ts">
const { db, logout, dashboardSummary } = useMockDb()
const router = useRouter()

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
  { to: '/admin/restaurants', label: 'Restaurants', icon: 'lucide:store' },
  { to: '/admin/generate', label: 'Generate voucher', icon: 'lucide:sparkles' },
  { to: '/admin/vouchers', label: 'Vouchers', icon: 'lucide:ticket' },
  { to: '/admin/orders', label: 'Orders', icon: 'lucide:package' },
  { to: '/admin/walk-ins', label: 'Walk-ins', icon: 'lucide:footprints' },
  { to: '/admin/payouts', label: 'Payouts', icon: 'lucide:wallet' },
  { to: '/admin/notifications', label: 'Notifications', icon: 'lucide:bell' },
  { to: '/admin/audit-log', label: 'Audit log', icon: 'lucide:history' },
  { to: '/admin/settings', label: 'Settings', icon: 'lucide:settings' }
]

const badgeCount = computed(() => dashboardSummary.value.invitedRestaurants + dashboardSummary.value.openDisputes)

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
    :badge="badgeCount > 0 ? { tone: 'warning', label: `${badgeCount} needs attention` } : undefined"
    @logout="handleLogout"
  >
    <slot />
  </DashboardShell>
</template>
