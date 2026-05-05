import { db } from '~~/server/db/index'
import { suppliers } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const [supplier] = await db.update(suppliers)
    .set({ name: body.name, tin: body.tin, vatRegNo: body.vatRegNo, phone: body.phone, address: body.address })
    .where(eq(suppliers.id, id))
    .returning()
  if (!supplier) throw createError({ statusCode: 404, message: 'Supplier not found' })
  return supplier
})