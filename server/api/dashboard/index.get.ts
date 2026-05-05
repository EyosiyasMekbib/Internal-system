import { db } from '../../db'
import { salesOrders, purchaseOrders, items } from '../../db/schema'
import { sql, lt } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [salesResult] = await db
    .select({
      totalSales: sql<string>`COALESCE(SUM(grand_total), 0)`,
      totalVat: sql<string>`COALESCE(SUM(vat_amount), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(salesOrders)
    .where(sql`date BETWEEN ${monthStart} AND ${monthEnd}`)

  const [purchasesResult] = await db
    .select({
      totalPurchases: sql<string>`COALESCE(SUM(grand_total), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(purchaseOrders)
    .where(sql`date BETWEEN ${monthStart} AND ${monthEnd}`)

  const lowStockItems = await db
    .select({ id: items.id, name: items.name, stockQty: items.stockQty, unit: items.unit })
    .from(items)
    .where(lt(items.stockQty, '5'))

  const grossProfit = Number(salesResult.totalSales) - Number(salesResult.totalVat) - Number(purchasesResult.totalPurchases)

  return {
    month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    sales: {
      total: Number(salesResult.totalSales),
      vat: Number(salesResult.totalVat),
      count: Number(salesResult.count),
    },
    purchases: {
      total: Number(purchasesResult.totalPurchases),
      count: Number(purchasesResult.count),
    },
    grossProfit,
    lowStockItems,
  }
})