import ExcelJS from 'exceljs'
import { db } from '~~/server/db/index'
import { payrollRuns, payslips, employees } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

const ACCOUNTING = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

    // Get payroll run
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id))

    if (!run) {
      throw createError({ statusCode: 404, message: 'Payroll run not found' })
    }

    // Get all payslips for this run with employee data
    const slips = await db
      .select({
        tin: employees.tin,
        fullName: employees.fullName,
        pensionId: employees.pensionId,
        startDate: employees.startDate,
        endDate: employees.endDate,
        basicSalary: payslips.basicSalary,
        transportAllowance: payslips.transportAllowance,
        taxableTransportAllowance: payslips.taxableTransportAllowance,
        overTime: payslips.overTime,
        otherTaxableBenefit: payslips.otherTaxableBenefit,
        totalTaxable: payslips.totalTaxable,
        taxWithheld: payslips.taxWithheld,
        costSharing: payslips.costSharing,
      })
      .from(payslips)
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .where(eq(payslips.payrollRunId, id))

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Katerina ERP'
    const ws = wb.addWorksheet('Payroll')

    // Header row with merged cells for title
    ws.mergeCells('A1:M1')
    ws.getCell('A1').value = `Payroll Report - ${Number(run.month).toString().padStart(2, '0')}/${run.year}`
    ws.getCell('A1').font = { name: 'Calibri', size: 14, bold: true }
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 25

    // Column headers (row 3)
    const headers = [
      'Employee TIN',
      'Employee Full Name',
      'Pension ID',
      'Start Date',
      'End Date',
      'Basic Salary',
      'Transport Allowance',
      'Taxable Transport',
      'Over Time',
      'Other Taxable Benefit',
      'Total Taxable',
      'Tax Withheld',
      'Cost Sharing',
    ]

    headers.forEach((h, i) => {
      const cell = ws.getCell(3, i + 1)
      cell.value = h
      cell.font = { name: 'Calibri', size: 11, bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = { left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' }, bottom: { style: 'thin' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }
    })

    ws.getRow(3).height = 30

    // Set column widths
    ws.getColumn(1).width = 16
    ws.getColumn(2).width = 20
    ws.getColumn(3).width = 14
    ws.getColumn(4).width = 14
    ws.getColumn(5).width = 14
    ws.getColumn(6).width = 16
    ws.getColumn(7).width = 16
    ws.getColumn(8).width = 16
    ws.getColumn(9).width = 14
    ws.getColumn(10).width = 16
    ws.getColumn(11).width = 14
    ws.getColumn(12).width = 14
    ws.getColumn(13).width = 14

    // Data rows
    slips.forEach((slip, i) => {
      const rowNum = 4 + i
      const row = ws.getRow(rowNum)

      ws.getCell(rowNum, 1).value = slip.tin
      ws.getCell(rowNum, 2).value = slip.fullName
      ws.getCell(rowNum, 3).value = slip.pensionId || ''
      ws.getCell(rowNum, 4).value = slip.startDate
      ws.getCell(rowNum, 5).value = slip.endDate || ''

      // Numeric fields with accounting format
      const numericCells = [6, 7, 8, 9, 10, 11, 12, 13]
      const values = [
        Number(slip.basicSalary),
        Number(slip.transportAllowance),
        Number(slip.taxableTransportAllowance),
        Number(slip.overTime),
        Number(slip.otherTaxableBenefit),
        Number(slip.totalTaxable),
        Number(slip.taxWithheld),
        Number(slip.costSharing),
      ]

      numericCells.forEach((col, idx) => {
        const cell = ws.getCell(rowNum, col)
        cell.value = values[idx]
        cell.numFmt = ACCOUNTING
        cell.alignment = { horizontal: 'right' }
      })

      // Border for all cells
      for (let col = 1; col <= 13; col++) {
        const cell = ws.getCell(rowNum, col)
        cell.border = { left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' }, bottom: { style: 'thin' } }
      }
    })

    // Totals row
    if (slips.length > 0) {
      const totalRowNum = 4 + slips.length
      const totalRow = ws.getRow(totalRowNum)
      totalRow.getCell(2).value = 'TOTAL'
      totalRow.getCell(2).font = { bold: true }

      const numericCols = [6, 7, 8, 9, 10, 11, 12, 13]
      const colLetters = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']

      numericCols.forEach((col, idx) => {
        const cell = ws.getCell(totalRowNum, col)
        cell.value = { formula: `SUM(${colLetters[idx]}4:${colLetters[idx]}${totalRowNum - 1})` }
        cell.numFmt = ACCOUNTING
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'right' }
        cell.border = { left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'medium' }, bottom: { style: 'medium' } }
      })
    }

    const buffer = await wb.xlsx.writeBuffer()

    setResponseHeaders(event, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Payroll_${run.year}_${String(run.month).padStart(2, '0')}.xlsx"`
    })

    return buffer
  } catch (err: any) {
    console.error('[Payroll Export Error]:', err)
    throw createError({
      statusCode: 500,
      message: `Failed to generate Excel: ${err.message}`
    })
  }
})
