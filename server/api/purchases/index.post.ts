import { db } from '~~/server/db/index'
import { purchaseOrders, purchaseOrderLines, items } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export function weightedAverageCost(
  currentStock: number,
  currentCost: number,
  addedQty: number,
  addedUnitCost: number
): number {
  if (currentStock + addedQty === 0) return 0
  return (currentStock * currentCost + addedQty * addedUnitCost) / (currentStock + addedQty)
}

interface PurchaseLine {
  itemId: string
  countryOfOrigin?: string
  brandName?: string
  qty: number
  unitPrice: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.supplierId || !body.date || !Array.isArray(body.lines) || body.lines.length === 0) {
    throw createError({ statusCode: 422, message: 'supplierId, date, and lines[] are required' })
  }

  const lines: PurchaseLine[] = body.lines

  // Calculate order totals (purchases include VAT at order level, not line level)
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vatAmount = body.vatAmount != null ? Number(body.vatAmount) : 0
  const grandTotal = subtotal + vatAmount

  return await db.transaction(async (tx) => {
    // Insert order
    const [order] = await tx.insert(purchaseOrders).values({
      supplierId: body.supplierId,
      date: body.date,
      voucherNo: body.voucherNo ?? null,
      subtotal: String(subtotal.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      notes: body.notes ?? null,
    }).returning()

    // Insert lines + update inventory
    for (const line of lines) {
      const lineTotal = line.qty * line.unitPrice

      await tx.insert(purchaseOrderLines).values({
        purchaseOrderId: order.id,
        itemId: line.itemId,
        countryOfOrigin: line.countryOfOrigin ?? null,
        brandName: line.brandName ?? null,
        qty: String(line.qty),
        unitPrice: String(line.unitPrice),
        total: String(lineTotal.toFixed(2)),
      })

      // Update item stock + weighted average cost
      const [item] = await tx.select().from(items).where(eq(items.id, line.itemId))
      if (!item) throw createError({ statusCode: 404, message: `Item ${line.itemId} not found` })

      const newCost = weightedAverageCost(
        Number(item.stockQty),
        Number(item.costPrice),
        line.qty,
        line.unitPrice
      )

      await tx.update(items)
        .set({
          stockQty: String((Number(item.stockQty) + line.qty).toFixed(4)),
          costPrice: String(newCost.toFixed(4)),
          updatedAt: new Date(),
        })
        .where(eq(items.id, line.itemId))
    }

    return order
  })
})