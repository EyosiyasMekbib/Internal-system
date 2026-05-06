export default defineNuxtRouteMiddleware(async (to) => {
  // Server-side redirects are handled by server/middleware/auth.ts
  if (import.meta.server) return
  if (to.path === '/setup') return

  // On first launch: redirect to setup if no users exist yet
  const { hasUsers } = await $fetch<{ hasUsers: boolean }>('/api/setup/status')
  if (!hasUsers) return navigateTo('/setup')

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