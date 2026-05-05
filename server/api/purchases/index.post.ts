import { db } from '~~/server/db/index'
import { purchaseOrders, purchaseOrderLines } from '~~/server/db/schema'

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
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vatAmount = body.vatAmount != null ? Number(body.vatAmount) : 0
  const grandTotal = subtotal + vatAmount

  return await db.transaction(async (tx) => {
    const [order] = await tx.insert(purchaseOrders).values({
      supplierId: body.supplierId,
      date: body.date,
      voucherNo: body.voucherNo ?? null,
      subtotal: String(subtotal.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      notes: body.notes ?? null,
    }).returning()

    for (const line of lines) {
      await tx.insert(purchaseOrderLines).values({
        purchaseOrderId: order.id,
        itemId: line.itemId,
        countryOfOrigin: line.countryOfOrigin ?? null,
        brandName: line.brandName ?? null,
        qty: String(line.qty),
        unitPrice: String(line.unitPrice),
        total: String((line.qty * line.unitPrice).toFixed(2)),
      })
    }

    return order
  })
})
