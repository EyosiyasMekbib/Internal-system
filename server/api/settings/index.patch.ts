import { db } from '~~/server/db/index'
import { settings } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as Record<string, string>
  const allowed = ['vat_rate', 'mrc_code']

  for (const [key, value] of Object.entries(body)) {
    if (!allowed.includes(key)) continue
    await db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
  }

  const rows = await db.select().from(settings)
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
})
