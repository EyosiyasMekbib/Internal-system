import ExcelJS from 'exceljs'
import { db } from '~~/server/db/index'
import { salesOrders, salesOrderLines, customers, items, settings } from '~~/server/db/schema'
import { eq, between } from 'drizzle-orm'
import { ecMonthDateRange, formatEcDate, formatEcMonth } from '~~/server/utils/ec-dates'

const ACCOUNTING = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)'

const thinBorder = (sides: string[]) =>
  Object.fromEntries(sides.map(s => [s, { style: 'thin' as const, color: { indexed: 64 } }]))

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const ecYear  = Number(query.ec_year)
  const ecMonth = Number(query.ec_month)

  if (!ecYear || !ecMonth) {
    throw createError({ statusCode: 422, message: 'ec_year and ec_month required' })
  }

  const { startStr, endStr } = ecMonthDateRange(ecYear, ecMonth)

  const [mrcSetting, tinSetting, nameSetting] = await Promise.all([
    db.query.settings.findFirst({ where: eq(settings.key, 'mrc_code') }),
    db.query.settings.findFirst({ where: eq(settings.key, 'tin') }),
    db.query.settings.findFirst({ where: eq(settings.key, 'company_name') }),
  ])
  const mrcCode = mrcSetting?.value ?? ''
  const tin     = tinSetting?.value  ?? '0007036896'
  const companyName = nameSetting?.value ?? 'KATERINAFARALDI'

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
  wb.creator = companyName
  const ws = wb.addWorksheet('Sheet1')

  const lastDay = ecMonth === 13 ? 5 : 30
  const monthName = formatEcMonth(ecYear, ecMonth).split(' ')[0]

  // ── Rows 1-4: company info block (match reference: value in col E, merged) ──
  ws.mergeCells('E1:N1')
  const r1 = ws.getCell('E1')
  r1.value = companyName
  r1.font = { name: 'Calibri', size: 11 }
  r1.alignment = { horizontal: 'center' }

  ws.mergeCells('E2:N2')
  const r2 = ws.getCell('E2')
  r2.value = 'VAT Sales Summary'
  r2.font = { name: 'Calibri', size: 11 }
  r2.alignment = { horizontal: 'center' }

  ws.mergeCells('E3:N3')
  const r3 = ws.getCell('E3')
  r3.value = `From ${monthName} 1-${lastDay}, ${ecYear} EC`
  r3.font = { name: 'Calibri', size: 11 }
  r3.alignment = { horizontal: 'center' }

  ws.mergeCells('E4:N4')
  const r4 = ws.getCell('E4')
  r4.value = `TIN ${tin}`
  r4.font = { name: 'Calibri', size: 11 }
  r4.alignment = { horizontal: 'center' }

  // ── Row 5: full-width Amharic title ──
  ws.mergeCells('A5:N5')
  const r5 = ws.getCell('A5')
  r5.value = `ከ ${monthName} 01/${ecYear} ዓ.ም እስከ ${monthName} ${lastDay}/${ecYear} ዓ.ም የተከናወነ የእያንዳንዱ ሽያጭ መረጃ መመዝገቢያ ቅጽ`
  r5.font = { name: 'Book Antiqua', size: 14 }
  r5.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(5).height = 19.5

  // ── Rows 6-7: two-row column headers ──
  // Most columns span both rows (A6:A7, B6:B7, etc.)
  // L6:M6 are merged together (FS No area spans 2 cols) and L7, M7 are separate
  // N6:N7 is merged
  // K6 is NOT merged (it's a single row label)
  // J6:J7 is merged
  ws.getRow(6).height = 30
  ws.getRow(7).height = 66.75

  type BorderStyle = { style: 'thin' | 'medium'; color?: { indexed?: number; argb?: string } }
  type BorderSides = { left?: BorderStyle; right?: BorderStyle; top?: BorderStyle; bottom?: BorderStyle }

  function setColHeader(ref: string, val: string, mergeTo?: string, extraStyle?: { border?: BorderSides; numFmt?: string }) {
    if (mergeTo) ws.mergeCells(`${ref}:${mergeTo}`)
    const cell = ws.getCell(ref)
    cell.value = val
    cell.font = { name: 'Book Antiqua', size: 11 }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = extraStyle?.border ?? thinBorder(['left', 'right', 'top', 'bottom']) as any
    if (extraStyle?.numFmt) cell.numFmt = extraStyle.numFmt
  }

  // A6:A7 merged
  setColHeader('A6', 'ተ.ቁ', 'A7')
  // B6:B7
  setColHeader('B6', 'የተሸጠው የዕቃ መጠሪያ (A) ', 'B7')
  // C6:C7
  setColHeader('C6', 'የስሪት ሀገር          (B)', 'C7')
  // D6:D7
  setColHeader('D6', 'Brand Name              (C )', 'D7')
  // E6:E7
  setColHeader('E6', 'መለኪያ ', 'E7', { border: thinBorder(['left', 'right', 'top', 'bottom']) as any })
  // F6:F7
  setColHeader('F6', 'ብዛት          (D)', 'F7', { numFmt: ACCOUNTING })
  // G6:G7
  setColHeader('G6', 'የአንዱ አማካይ ግዢ ዋጋ                       ( Unit Average Cost) (E) ', 'G7', { numFmt: ACCOUNTING })
  // H6:H7
  setColHeader('H6', 'የአንዱ ሽያጭ ዋጋ     ከ ተ.እ.ታ በፊት             ( F ) ', 'H7', { numFmt: ACCOUNTING })
  // I6:I7
  setColHeader('I6', 'የተ.እ.ታ /ቲ.ኦ.ቲ  /     (G )', 'I7')
  // J6:J7
  setColHeader('J6', 'ጠቅላላ ዋጋ                        ታክስ ጨምሮ                     H (F+G)', 'J7')
  // K6 only (row 6), not merged with row 7 → K7 has separate label
  const k6 = ws.getCell('K6')
  k6.value = 'ጠቅላላ ዋጋ ተ.እ.ታ ጨምሮ '
  k6.font = { name: 'Power Geez Unicode1', size: 11 }
  k6.alignment = { vertical: 'middle', wrapText: true }
  k6.border = { right: { style: 'medium', color: { indexed: 64 } }, top: { style: 'medium', color: { indexed: 64 } } }

  const k7 = ws.getCell('K7')
  k7.value = 'K=(F*J)'
  k7.font = { name: 'Power Geez Unicode1', size: 11 }
  k7.alignment = { vertical: 'middle', wrapText: true }
  k7.border = { right: { style: 'medium', color: { indexed: 64 } }, bottom: { style: 'medium', color: { indexed: 64 } } }

  // L6:M6 merged ("ሽያጭ የተፈፀመበት")
  ws.mergeCells('L6:M6')
  const l6 = ws.getCell('L6')
  l6.value = 'ሽያጭ የተፈፀመበት '
  l6.font = { name: 'Book Antiqua', size: 11 }
  l6.alignment = { horizontal: 'center', vertical: 'middle' }
  l6.border = { ...thinBorder(['left', 'top', 'bottom']) as any }

  // L7: FS No label
  const l7 = ws.getCell('L7')
  l7.value = 'የሽያጭ ደረሰኝ  ቁጥር          (FS No)          (J)'
  l7.font = { name: 'Book Antiqua', size: 11 }
  l7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  l7.border = thinBorder(['left', 'right', 'top', 'bottom']) as any

  // M7: Date label
  const m7 = ws.getCell('M7')
  m7.value = 'ሽያጩ የተከናወነበት                              ቀን (ወር) ዓ.ም              (J)'
  m7.font = { name: 'Book Antiqua', size: 11 }
  m7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  m7.border = thinBorder(['left', 'right', 'top', 'bottom']) as any

  // N6:N7 merged MRC
  setColHeader('N6', 'የሽያጭ መመዝገቢያ መለኪያ ኮድ /MRC/                               (K)', 'N7')

  // ── Column widths (from reference) ──
  ws.getColumn(1).width  = 7
  ws.getColumn(2).width  = 38
  ws.getColumn(3).width  = 14
  ws.getColumn(4).width  = 14
  ws.getColumn(5).width  = 14
  ws.getColumn(6).width  = 10.5
  ws.getColumn(7).width  = 18.9
  ws.getColumn(8).width  = 20.9
  ws.getColumn(9).width  = 11.5
  ws.getColumn(10).width = 16.9
  ws.getColumn(11).width = 15.7
  ws.getColumn(12).width = 12.9
  ws.getColumn(13).width = 17.3
  ws.getColumn(14).width = 16.9

  // ── Data rows ──
  const dataBorder = thinBorder(['left', 'right', 'top', 'bottom']) as any

  rows.forEach((r, i) => {
    const qty       = Number(r.qty       || 0)
    const unitPrice = Number(r.unitPrice || 0)
    const vatAmount = Number(r.vatAmount || 0)
    const total     = Number(r.total     || 0)
    const costPrice = Number(r.costPrice || 0)
    const kVal      = qty * unitPrice + vatAmount

    const rowNum = 8 + i
    const row = ws.getRow(rowNum)
    row.height = 16.5

    const setCell = (col: number, val: any, opts: { numFmt?: string; font?: string; align?: string } = {}) => {
      const cell = ws.getCell(rowNum, col)
      cell.value = val
      cell.font = { name: opts.font ?? 'Calibri', size: 11 }
      cell.border = col === 11
        ? { ...dataBorder, right: { style: 'medium', color: { indexed: 64 } } }
        : dataBorder
      if (opts.numFmt) cell.numFmt = opts.numFmt
      if (opts.align) cell.alignment = { horizontal: opts.align as any }
    }

    setCell(1,  i + 1,              { font: 'Book Antiqua', align: 'center' })
    setCell(2,  r.itemName,         { font: 'Calibri' })
    setCell(3,  r.countryOfOrigin ?? '', { font: 'Power Geez Unicode1' })
    setCell(4,  r.brandName       ?? '', { font: 'Power Geez Unicode1' })
    setCell(5,  r.itemUnit,         { font: 'Power Geez Unicode1', align: 'center' })
    setCell(6,  qty,                { numFmt: ACCOUNTING, align: 'center' })
    setCell(7,  costPrice,          { numFmt: ACCOUNTING, align: 'right' })
    setCell(8,  unitPrice,          { numFmt: ACCOUNTING })
    setCell(9,  vatAmount,          { numFmt: ACCOUNTING })
    setCell(10, total,              { numFmt: ACCOUNTING })
    setCell(11, kVal,               { numFmt: ACCOUNTING })
    setCell(12, r.fsNo,             { font: 'Book Antiqua', align: 'center' })
    setCell(13, formatEcDate(new Date(r.saleDate!)), { font: 'Power Geez Unicode1', align: 'right' })
    setCell(14, mrcCode,            { font: 'Book Antiqua', align: 'center' })
  })

  const buffer = await wb.xlsx.writeBuffer()
  const ecMonthStr = formatEcMonth(ecYear, ecMonth).split(' ')[0]

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="${ecMonthStr}-${ecYear}.xlsx"`)
  return send(event, Buffer.from(buffer as ArrayBuffer))
})
