import { db } from '~~/server/db/index'
import { employees } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.tin || !body.fullName || !body.startDate || body.basicSalary === undefined) {
    throw createError({ statusCode: 422, message: 'tin, fullName, startDate, and basicSalary are required' })
  }

  const [employee] = await db.insert(employees).values({
    tin: body.tin,
    fullName: body.fullName,
    pensionId: body.pensionId || null,
    startDate: body.startDate,
    endDate: body.endDate || null,
    basicSalary: String(body.basicSalary),
    transportAllowance: String(body.transportAllowance || 0),
  }).returning()

  return employee
})
