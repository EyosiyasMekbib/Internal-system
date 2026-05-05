import { db } from '~~/server/db/index'
import { employees } from '~~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db.select().from(employees).orderBy(asc(employees.fullName))
})
