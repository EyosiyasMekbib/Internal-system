import { db } from '~~/server/db/index'
import { items } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(items).where(eq(items.id, id))
  return { ok: true }
})