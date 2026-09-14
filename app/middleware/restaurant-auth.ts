export default defineNuxtRouteMiddleware((to) => {
  const open = ['/restaurant/register', '/restaurant/login', '/restaurant/pending']
  if (open.includes(to.path)) return

  const { session, currentRestaurant } = useMockDb()
  if (session.value.role !== 'restaurant' || !currentRestaurant.value) {
    return navigateTo('/restaurant/login')
  }
  if (currentRestaurant.value.status !== 'approved') {
    return navigateTo('/restaurant/pending')
  }
})
