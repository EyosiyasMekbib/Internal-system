import { db } from '../../db/index'
import { authUser } from '../../db/schema'

export default defineEventHandler(async () => {
  const users = await db.select({ id: authUser.id }).from(authUser).limit(1)
  return { hasUsers: users.length > 0 }
})
