// tests/db.test.ts
import { describe, it, expect } from 'vitest'

describe('db client', () => {
  it('exports a drizzle instance', async () => {
    const mod = await import('../server/db/index')
    expect(mod.db).toBeDefined()
  })
})
