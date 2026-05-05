import { db } from '~~/server/db/index'
import { suppliers } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 422, message: 'name is required' })
  const [supplier] = await db.insert(suppliers).values({
    name: body.name,
    tin: body.tin ?? null,
    vatRegNo: body.vatRegNo ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
  }).returning()
  return supplier
})