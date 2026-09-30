// app/middleware/admin-auth.ts
export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()
  await auth.ready()
  if (auth.role.value !== 'admin') {
    return navigateTo('/admin/login')
  }
})
