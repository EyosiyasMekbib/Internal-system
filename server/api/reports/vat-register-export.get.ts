import ExcelJS from 'exceljs'
import { db } from '~~/server/db/index'
import { salesOrders, salesOrderLines, customers, items, settings } from '~~/server/db/schema'
import { eq, between } from 'drizzle-orm'
import { ecMonthDateRange, formatEcDate, formatEcMonth } from '~~/server/utils/ec-dates'

const AM_HEADERS = [
  'ተ.ቁ',
  'የተሸጠው የዕቃ መጠሪያ (A)',
  'የስሪት ሀገር (B)',
  'Brand Name (C)',
  'መለኪያ',
  'ብዛት (D)',
  'የአንዱ አማካይ ግዢ ዋጋ (E)',
  'የአንዱ ሽያጭ ዋጋ ከ ተ.እ.ታ በፊት (F)',
  'የተ.እ.ታ (15%) (G)',
  'ጠቅላላ ዋጋ ታክስ ጨምሮ H(F+G)',
  'K=(F×J)',
  'የሽያጭ ደረሰኝ ቁጥር (FS No.) (J)',
  'ሽያጩ የተከናወነበት ቀን (J)',
  'MRC (K)',
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const ecYear = Number(query.ec_year)
  const ecMonth = Number(query.ec_month)

  if (!ecYear || !ecMonth) {
    throw createError({ statusCode: 422, message: 'ec_year and ec_month required' })
  }

  const { start, end } = ecMonthDateRange(ecYear, ecMonth)
  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

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
      vatAmount: salesOrderLines.vatAmount,
      total: salesOrderLines.total,
      costPrice: salesOrderLines.costPrice,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(salesOrderLines, eq(salesOrderLines.salesOrderId, salesOrders.id))
    .leftJoin(items, eq(salesOrderLines.itemId, items.id))
    .where(between(salesOrders.date, startStr, endStr))
    .orderBy(salesOrders.date)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')

  // Header rows
  ws.mergeCells('A1:N1')
  ws.getCell('A1').value = 'KATERINAFARALDI'
  ws.getCell('A1').font = { bold: true, size: 12 }

  ws.mergeCells('A2:N2')
  ws.getCell('A2').value = 'VAT Sales Summary'

  ws.mergeCells('A3:N3')
  ws.getCell('A3').value = `From ${formatEcMonth(ecYear, ecMonth)}`

  ws.mergeCells('A4:N4')
  ws.getCell('A4').value = 'TIN 0007036896'

  ws.mergeCells('A5:N5')
  ws.getCell('A5').value = `ከ ${formatEcMonth(ecYear, ecMonth)} የተከናወነ የእያንዳንዱ ሽያጭ መረጃ መመዝገቢያ ቅጽ`

  // Column headers row 6
  const headerRow = ws.addRow(AM_HEADERS)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }

  // Data rows
  rows.forEach((r, i) => {
    const qty = Number(r.qty || 0)
    const unitPrice = Number(r.unitPrice || 0)
    const vatAmount = Number(r.vatAmount || 0)
    const total = Number(r.total || 0)
    ws.addRow([
      i + 1,
      r.itemName,
      r.countryOfOrigin ?? '',
      r.brandName ?? '',
      r.itemUnit,
      qty,
      Number(r.costPrice || 0),
      unitPrice,
      vatAmount,
      total,
      qty * unitPrice + vatAmount,
      r.fsNo,
      formatEcDate(new Date(r.saleDate!)),
      mrcCode,
    ])
  })

  // Column widths
  ws.columns = [
    { width: 6 }, { width: 30 }, { width: 15 }, { width: 18 },
    { width: 10 }, { width: 10 }, { width: 18 }, { width: 18 },
    { width: 14 }, { width: 18 }, { width: 14 }, { width: 18 },
    { width: 22 }, { width: 18 },
  ]

  const buffer = await wb.xlsx.writeBuffer()

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="vat-register-${ecYear}-${ecMonth}.xlsx"`)
  return buffer
})
