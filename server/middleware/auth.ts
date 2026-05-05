import { auth } from '../auth'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip auth routes, static assets, and Nuxt internals
  if (
    path.startsWith('/api/auth/') ||
    path.startsWith('/api/setup/') ||
    path.startsWith('/_nuxt/') ||
    path.startsWith('/__nuxt') ||
    path === '/favicon.ico'
  ) return

  const session = await auth.api.getSession({ headers: event.headers })

  if (path.startsWith('/api/')) {
    // Protect all API routes except /api/auth/*
    if (!session) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    event.context.session = session
    return
  }

  // Redirect unauthenticated page requests to /login (or /setup on first run)
  if (!session && path !== '/login' && path !== '/setup') {
    return sendRedirect(event, '/login', 302)
  }

  if (session) event.context.session = session
})