import { db } from '~~/server/db/index'
import { salesOrders, salesOrderLines, items, settings } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const lineSchema = z.object({
  itemId: z.string().uuid(),
  countryOfOrigin: z.string().optional(),
  brandName: z.string().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
})

const schema = z.object({
  customerId: z.string().uuid(),
  date: z.string(),
  fsNo: z.string(),
  lines: z.array(lineSchema).min(1),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  // Read VAT rate from settings
  const vatSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'vat_rate') })
  const vatRate = Number(vatSetting?.value ?? '0.15')

  return await db.transaction(async (tx) => {
    let subtotal = 0
    let totalVat = 0

    // Pre-fetch item cost prices
    const lineData = await Promise.all(body.lines.map(async (line) => {
      const item = await tx.query.items.findFirst({ where: eq(items.id, line.itemId) })
      if (!item) throw createError({ statusCode: 404, message: `Item ${line.itemId} not found` })
      const lineSubtotal = line.qty * line.unitPrice
      const vatAmount = Math.round(lineSubtotal * vatRate * 100) / 100
      subtotal += lineSubtotal
      totalVat += vatAmount
      return { ...line, costPrice: item.costPrice, vatAmount }
    }))

    const grandTotal = subtotal + totalVat

    const [order] = await tx.insert(salesOrders).values({
      customerId: body.customerId,
      date: body.date,
      fsNo: body.fsNo,
      notes: body.notes ?? null,
      subtotal: subtotal.toFixed(2),
      vatAmount: totalVat.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
    }).returning()

    if (!order) throw createError({ statusCode: 500, message: 'Failed to create sales order' })

    for (const line of lineData) {
      const lineTotal = line.qty * line.unitPrice + line.vatAmount
      await tx.insert(salesOrderLines).values({
        salesOrderId: order.id,
        itemId: line.itemId,
        countryOfOrigin: line.countryOfOrigin,
        brandName: line.brandName,
        qty: line.qty.toString(),
        unitPrice: line.unitPrice.toString(),
        costPrice: line.costPrice,
        vatAmount: line.vatAmount.toString(),
        total: lineTotal.toFixed(2),
      })
    }

    return order
  })
})
