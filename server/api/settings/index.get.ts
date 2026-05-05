import { db } from '~~/server/db/index'
import { settings } from '~~/server/db/schema'

export default defineEventHandler(async () => {
  const rows = await db.select().from(settings)
  return Object.fromEntries(rows.map(r => [r.key, r.value])) as {
    vat_rate: string
    mrc_code: string
  }
})
