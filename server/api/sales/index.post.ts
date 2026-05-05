import { db } from '../../db'
import { salesOrders, salesOrderLines, items } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const lineSchema = z.object({
  itemId: z.string().uuid(),
  countryOfOrigin: z.string().optional(),
  brandName: z.string().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  vatAmount: z.number().nonnegative(),
})

const schema = z.object({
  customerId: z.string().uuid(),
  date: z.string(),
  fsNo: z.string(),
  mrcCode: z.string().optional(),
  lines: z.array(lineSchema).min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  const subtotal = body.lines.reduce((acc, l) => acc + l.qty * l.unitPrice, 0)
  const vatAmount = body.lines.reduce((acc, l) => acc + l.vatAmount, 0)
  const grandTotal = subtotal + vatAmount

  return await db.transaction(async (tx) => {
    const [order] = await tx.insert(salesOrders).values({
      customerId: body.customerId,
      date: body.date,
      fsNo: body.fsNo,
      mrcCode: body.mrcCode,
      subtotal: subtotal.toString(),
      vatAmount: vatAmount.toString(),
      grandTotal: grandTotal.toString(),
    }).returning()

    if (!order) throw createError({ statusCode: 500, message: 'Failed to create sales order' })

    for (const line of body.lines) {
      await tx.insert(salesOrderLines).values({
        salesOrderId: order.id,
        itemId: line.itemId,
        countryOfOrigin: line.countryOfOrigin,
        brandName: line.brandName,
        qty: line.qty.toString(),
        unitPrice: line.unitPrice.toString(),
        vatAmount: line.vatAmount.toString(),
        total: (line.qty * line.unitPrice + line.vatAmount).toString(),
      })

      // Deduct inventory
      const currentItem = await tx.query.items.findFirst({
        where: eq(items.id, line.itemId)
      })
      
      if (currentItem) {
        const currentQty = Number(currentItem.stockQty) || 0
        await tx.update(items).set({
          stockQty: (currentQty - line.qty).toString()
        }).where(eq(items.id, line.itemId))
      }
    }

    return order
  })
})
