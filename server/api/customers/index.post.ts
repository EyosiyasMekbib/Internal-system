import { db } from '~~/server/db/index'
import { customers } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 422, message: 'name is required' })
  const [customer] = await db.insert(customers).values({
    name: body.name,
    tin: body.tin ?? null,
    vatRegNo: body.vatRegNo ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
  }).returning()
  return customer
})