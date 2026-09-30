<!-- app/layouts/admin.vue -->
<script setup lang="ts">
const auth = useAuth()
const supabase = useSupabase()
const router = useRouter()
const route = useRoute()

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

// "Needs attention": restaurants yet to accept their invite + open delivery disputes.
// Re-counted on every navigation so it reflects actions just taken.
const attentionCount = ref(0)
async function countAttention() {
  const [invited, disputes] = await Promise.all([
    supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('status', 'invited'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('dispute_status', 'open')
  ])
  attentionCount.value = (invited.count ?? 0) + (disputes.count ?? 0)
}
watch(() => route.path, countAttention, { immediate: true })

async function handleLogout() {
  await auth.signOut()
  router.push('/admin/login')
}
</script>

<template>
  <DashboardShell
    brand="KokoSend Admin"
    :nav-items="navItems"
    identity-label="Admin"
    :identity-sub="auth.user.value?.email ?? ''"
    :badge="attentionCount > 0 ? { tone: 'warning', label: `${attentionCount} needs attention` } : undefined"
    @logout="handleLogout"
  >
    <slot />
  </DashboardShell>
</template>
