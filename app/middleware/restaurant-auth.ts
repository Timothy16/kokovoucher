// app/middleware/restaurant-auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const openPrefixes = ['/restaurant/login', '/restaurant/invite', '/restaurant/disabled']
  if (openPrefixes.some((p) => to.path === p || to.path.startsWith(`${p}/`))) return

  const { session, currentRestaurant } = useMockDb()
  if (session.value.role !== 'restaurant' || !currentRestaurant.value) {
    return navigateTo('/restaurant/login')
  }
  if (currentRestaurant.value.status === 'disabled') {
    return navigateTo('/restaurant/disabled')
  }
})
