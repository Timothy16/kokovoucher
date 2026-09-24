// app/middleware/admin-auth.ts
export default defineNuxtRouteMiddleware(() => {
  const { session } = useMockDb()
  if (session.value.role !== 'admin') {
    return navigateTo('/admin/login')
  }
})
