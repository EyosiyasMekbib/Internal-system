import { db } from '~~/server/db/index'
import { employees, payrollRuns, payslips } from '~~/server/db/schema'
import { gte, lte, or, isNull, and, eq } from 'drizzle-orm'
import { calcPayslip } from '~~/server/utils/payroll-tax'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.month || !body.year) {
    throw createError({ statusCode: 422, message: 'month and year are required' })
  }

  // Get all active employees for this month
  // Active = startDate <= run month AND (endDate is null OR endDate >= run month)
  const runDateStr = `${body.year}-${String(body.month).padStart(2, '0')}-01`

  const activeEmployees = await db
    .select()
    .from(employees)
    .where(
      and(
        lte(employees.startDate, runDateStr),
        or(
          isNull(employees.endDate),
          gte(employees.endDate, runDateStr)
        )
      )
    )

  if (activeEmployees.length === 0) {
    throw createError({ statusCode: 400, message: 'No active employees for this period' })
  }

  return await db.transaction(async (tx) => {
    // If a run already exists for this period, reuse it (clear old payslips first)
    const [existing] = await tx
      .select({ id: payrollRuns.id })
      .from(payrollRuns)
      .where(and(eq(payrollRuns.month, String(body.month)), eq(payrollRuns.year, String(body.year))))
      .limit(1)

    let run: typeof payrollRuns.$inferSelect

    if (existing) {
      await tx.delete(payslips).where(eq(payslips.payrollRunId, existing.id))
      const [updated] = await tx
        .update(payrollRuns)
        .set({ notes: body.notes ?? null })
        .where(eq(payrollRuns.id, existing.id))
        .returning()
      run = updated
    } else {
      const [inserted] = await tx.insert(payrollRuns).values({
        month: String(body.month),
        year: String(body.year),
        notes: body.notes ?? null,
      }).returning()
      run = inserted
    }

    // Generate payslip for each active employee
    for (const emp of activeEmployees) {
      const payslipInput = {
        basicSalary: Number(emp.basicSalary),
        transportAllowance: Number(emp.transportAllowance),
        overTime: body.overTimeByEmployee?.[emp.id] ?? 0,
        otherTaxableBenefit: body.otherBenefitByEmployee?.[emp.id] ?? 0,
      }

      const result = calcPayslip(payslipInput)

      await tx.insert(payslips).values({
        payrollRunId: run.id,
        employeeId: emp.id,
        basicSalary: String(result.basicSalary),
        transportAllowance: String(result.transportAllowance),
        taxableTransportAllowance: String(result.taxableTransportAllowance),
        overTime: String(result.overTime),
        otherTaxableBenefit: String(result.otherTaxableBenefit),
        totalTaxable: String(result.totalTaxable),
        taxWithheld: String(result.taxWithheld),
        costSharing: String(result.costSharing),
        employerPension: String(result.employerPension),
        netPay: String(result.netPay),
      })
    }

    return run
  })
})
