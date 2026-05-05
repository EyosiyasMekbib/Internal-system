import { db } from '~~/server/db/index'
import { purchaseOrders, suppliers } from '~~/server/db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db
    .select({
      id: purchaseOrders.id,
      date: purchaseOrders.date,
      voucherNo: purchaseOrders.voucherNo,
      grandTotal: purchaseOrders.grandTotal,
      supplierName: suppliers.name,
      supplierId: purchaseOrders.supplierId,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .orderBy(desc(purchaseOrders.date))
})