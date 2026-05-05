// tests/schema.test.ts
import { describe, it, expect } from 'vitest'
import * as schema from '../server/db/schema'

describe('schema exports', () => {
  it('exports all required tables', () => {
    expect(schema.items).toBeDefined()
    expect(schema.suppliers).toBeDefined()
    expect(schema.customers).toBeDefined()
    expect(schema.purchaseOrders).toBeDefined()
    expect(schema.purchaseOrderLines).toBeDefined()
    expect(schema.salesOrders).toBeDefined()
    expect(schema.salesOrderLines).toBeDefined()
  })
})
