import { db } from '../../db'
import { salesOrders, salesOrderLines, customers, items } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const order = await db.query.salesOrders.findFirst({
    where: eq(salesOrders.id, id),
    with: {
      customer: true
    }
  })

  if (!order) throw createError({ statusCode: 404, message: 'Not found' })

  const lines = await db
    .select({
      id: salesOrderLines.id,
      itemId: salesOrderLines.itemId,
      itemName: items.name,
      qty: salesOrderLines.qty,
      unitPrice: salesOrderLines.unitPrice,
      total: salesOrderLines.total,
    })
    .from(salesOrderLines)
    .innerJoin(items, eq(salesOrderLines.itemId, items.id))
    .where(eq(salesOrderLines.salesOrderId, id))

  return { ...order, lines }
})