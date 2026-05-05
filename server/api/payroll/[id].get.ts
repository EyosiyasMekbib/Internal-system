import { db } from '~~/server/db/index'
import { payrollRuns, payslips, employees } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
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
      id: payslips.id,
      employeeId: payslips.employeeId,
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
      employerPension: payslips.employerPension,
      netPay: payslips.netPay,
      createdAt: payslips.createdAt,
    })
    .from(payslips)
    .innerJoin(employees, eq(payslips.employeeId, employees.id))
    .where(eq(payslips.payrollRunId, id))

  return {
    ...run,
    payslips: slips,
  }
})
