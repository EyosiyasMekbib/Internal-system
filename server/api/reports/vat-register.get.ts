import { db } from '~~/server/db/index'
import { salesOrders, salesOrderLines, customers, items, settings } from '~~/server/db/schema'
import { eq, between } from 'drizzle-orm'
import { ecMonthDateRange, formatEcDate, formatEcMonth } from '~~/server/utils/ec-dates'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const ecYear = Number(query.ec_year)
  const ecMonth = Number(query.ec_month)

  if (!ecYear || !ecMonth) {
    throw createError({ statusCode: 422, message: 'ec_year and ec_month are required' })
  }

  const { startStr, endStr } = ecMonthDateRange(ecYear, ecMonth)

  const mrcSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'mrc_code') })
  const mrcCode = mrcSetting?.value ?? ''

  const rows = await db
    .select({
      saleDate: salesOrders.date,
      fsNo: salesOrders.fsNo,
      itemName: items.name,
      itemUnit: items.unit,
      countryOfOrigin: salesOrderLines.countryOfOrigin,
      brandName: salesOrderLines.brandName,
      qty: salesOrderLines.qty,
      unitPrice: salesOrderLines.unitPrice,
      costPrice: salesOrderLines.costPrice,
      vatAmount: salesOrderLines.vatAmount,
      total: salesOrderLines.total,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(salesOrderLines, eq(salesOrderLines.salesOrderId, salesOrders.id))
    .leftJoin(items, eq(salesOrderLines.itemId, items.id))
    .where(between(salesOrders.date, startStr, endStr))
    .orderBy(salesOrders.date)

  const totals = rows.reduce((acc, r) => ({
    qty: acc.qty + Number(r.qty || 0),
    subtotal: acc.subtotal + Number(r.qty || 0) * Number(r.unitPrice || 0),
    vat: acc.vat + Number(r.vatAmount || 0),
    total: acc.total + Number(r.total || 0),
  }), { qty: 0, subtotal: 0, vat: 0, total: 0 })

  return {
    header: {
      company: 'KATERINA FARALDI',
      tin: '0007036896',
      monthLabel: formatEcMonth(ecYear, ecMonth),
      ecYear,
      ecMonth,
    },
    rows: rows.map((r, i) => {
      const qty = Number(r.qty || 0)
      const unitPrice = Number(r.unitPrice || 0)
      const vatAmount = Number(r.vatAmount || 0)
      const lineTotal = qty * unitPrice + vatAmount
      return {
        sn: i + 1,
        itemName: r.itemName,
        countryOfOrigin: r.countryOfOrigin ?? '',
        brandName: r.brandName ?? '',
        unit: r.itemUnit,
        qty: r.qty,
        costPrice: r.costPrice,
        unitPrice: r.unitPrice,
        vatAmount: r.vatAmount,
        lineTotal: lineTotal.toFixed(2),
        lineTotalWithVat: lineTotal.toFixed(2),
        fsNo: r.fsNo,
        saleDate: formatEcDate(new Date(r.saleDate!)),
        mrcCode,
      }
    }),
    totals,
  }
})
