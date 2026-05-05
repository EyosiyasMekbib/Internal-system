import { db } from '~~/server/db/index'
import { suppliers } from '~~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db.select().from(suppliers).orderBy(asc(suppliers.name))
})