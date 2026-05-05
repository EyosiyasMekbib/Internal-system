import { db } from '~~/server/db/index'
import { payrollRuns, payslips } from '~~/server/db/schema'
import { desc, eq, count, sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const runs = await db.select({
    id: payrollRuns.id,
    month: payrollRuns.month,
    year: payrollRuns.year,
    notes: payrollRuns.notes,
    createdAt: payrollRuns.createdAt,
  }).from(payrollRuns).orderBy(desc(payrollRuns.createdAt))

  const runsWithStats = await Promise.all(runs.map(async (run) => {
    const [stats] = await db
      .select({
        employeeCount: count(),
        totalGross: sql<string>`coalesce(sum(
          cast(${payslips.basicSalary} as numeric) +
          cast(${payslips.transportAllowance} as numeric) +
          cast(${payslips.overTime} as numeric) +
          cast(${payslips.otherTaxableBenefit} as numeric)
        ), 0)`,
        totalTax: sql<string>`coalesce(sum(cast(${payslips.taxWithheld} as numeric)), 0)`,
        totalPension: sql<string>`coalesce(sum(cast(${payslips.costSharing} as numeric)), 0)`,
        totalNet: sql<string>`coalesce(sum(cast(${payslips.netPay} as numeric)), 0)`,
      })
      .from(payslips)
      .where(eq(payslips.payrollRunId, run.id))

    return {
      ...run,
      employeeCount: Number(stats?.employeeCount || 0),
      totalGross: Number(stats?.totalGross || 0),
      totalTax: Number(stats?.totalTax || 0),
      totalPension: Number(stats?.totalPension || 0),
      totalNet: Number(stats?.totalNet || 0),
    }
  }))

  return runsWithStats
})
