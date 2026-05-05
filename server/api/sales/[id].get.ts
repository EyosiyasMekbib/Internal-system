import { db } from '~~/server/db/index'
import { salesOrders, salesOrderLines, customers, items } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const [order] = await db
    .select()
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .where(eq(salesOrders.id, id))

  if (!order) throw createError({ statusCode: 404, message: 'Not found' })

  const lines = await db
    .select({
      id: salesOrderLines.id,
      itemId: salesOrderLines.itemId,
      itemName: items.name,
      itemUnit: items.unit,
      countryOfOrigin: salesOrderLines.countryOfOrigin,
      brandName: salesOrderLines.brandName,
      qty: salesOrderLines.qty,
      unitPrice: salesOrderLines.unitPrice,
      vatAmount: salesOrderLines.vatAmount,
      total: salesOrderLines.total,
    })
    .from(salesOrderLines)
    .leftJoin(items, eq(salesOrderLines.itemId, items.id))
    .where(eq(salesOrderLines.salesOrderId, id))

  return {
    ...order.sales_orders,
    customer: order.customers,
    lines,
  }
})