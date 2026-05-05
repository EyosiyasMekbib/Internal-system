export default defineNuxtRouteMiddleware(async (to) => {
  // Server-side redirects are handled by server/middleware/auth.ts
  if (import.meta.server) return
  if (to.path === '/login') return

  try {
    const session = await $fetch<{ user?: unknown } | null>('/api/auth/get-session')
    if (!session?.user) {
      return navigateTo('/login')
    }
  } catch {
    return navigateTo('/login')
  }
})