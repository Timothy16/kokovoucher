// app/middleware/restaurant-auth.ts
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()
  await auth.ready()
  if (auth.role.value !== 'restaurant') {
    return navigateTo('/restaurant/login')
  }
  // Re-read status on each navigation so a restaurant disabled mid-session is sent to the
  // notice page promptly (RLS already stops it seeing any data).
  await auth.loadRestaurant()
  if (!auth.restaurant.value) {
    return navigateTo('/restaurant/login')
  }
  if (auth.restaurant.value.status === 'disabled') {
    await auth.signOut()
    return navigateTo('/restaurant/disabled')
  }
})
