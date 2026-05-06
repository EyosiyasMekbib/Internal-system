import { db } from '../../db/index'
import { authUser } from '../../db/schema'

// Public endpoint — no auth required — used to detect first launch
export default defineEventHandler(async () => {
  const users = await db.select({ id: authUser.id }).from(authUser).limit(1)
  return { hasUsers: users.length > 0 }
})
