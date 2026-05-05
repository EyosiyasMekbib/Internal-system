import { db } from '~~/server/db/index'
import { customers } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(customers).where(eq(customers.id, id))
  return { ok: true }
})