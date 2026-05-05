import { db } from '~~/server/db/index'
import { suppliers } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(suppliers).where(eq(suppliers.id, id))
  return { ok: true }
})