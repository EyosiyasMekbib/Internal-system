import { db } from '~~/server/db/index'
import { items } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const [item] = await db.update(items)
    .set({
      name: body.name,
      unit: body.unit,
      costPrice: String(body.costPrice),
      salePrice: String(body.salePrice),
      updatedAt: new Date(),
    })
    .where(eq(items.id, id))
    .returning()
  if (!item) throw createError({ statusCode: 404, message: 'Item not found' })
  return item
})