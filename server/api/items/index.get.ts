import { db } from '~~/server/db/index'
import { items } from '~~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db.select().from(items).orderBy(asc(items.name))
})