import { db } from '~~/server/db/index'
import { purchaseOrders, purchaseOrderLines, suppliers, items } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const [order] = await db
    .select()
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.id, id))

  if (!order) throw createError({ statusCode: 404, message: 'Purchase order not found' })

  const lines = await db
    .select({
      id: purchaseOrderLines.id,
      itemId: purchaseOrderLines.itemId,
      itemName: items.name,
      itemUnit: items.unit,
      countryOfOrigin: purchaseOrderLines.countryOfOrigin,
      brandName: purchaseOrderLines.brandName,
      qty: purchaseOrderLines.qty,
      unitPrice: purchaseOrderLines.unitPrice,
      total: purchaseOrderLines.total,
    })
    .from(purchaseOrderLines)
    .leftJoin(items, eq(purchaseOrderLines.itemId, items.id))
    .where(eq(purchaseOrderLines.purchaseOrderId, id))

  return {
    ...order.purchase_orders,
    supplier: order.suppliers,
    lines,
  }
})