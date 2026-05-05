import { db } from '~~/server/db/index'
import { customers } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const [customer] = await db.update(customers)
    .set({ name: body.name, tin: body.tin, vatRegNo: body.vatRegNo, phone: body.phone, address: body.address })
    .where(eq(customers.id, id))
    .returning()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })
  return customer
})