import { db } from '~~/server/db/index'
import { items } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name || !body.unit) {
    throw createError({ statusCode: 422, message: 'name and unit are required' })
  }
  const [item] = await db.insert(items).values({
    name: body.name,
    unit: body.unit,
    costPrice: String(body.costPrice ?? 0),
    salePrice: String(body.salePrice ?? 0),
  }).returning()
  return item
})