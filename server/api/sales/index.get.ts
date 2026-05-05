import { db } from '../../db'
import { salesOrders, customers } from '../../db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = await db
    .select({
      id: salesOrders.id,
      date: salesOrders.date,
      customerName: customers.name,
      grandTotal: salesOrders.grandTotal,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .orderBy(desc(salesOrders.date))
    
  return query
})