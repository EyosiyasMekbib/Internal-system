// tests/schema.test.ts
import { describe, it, expect } from 'vitest'
import { items, suppliers, customers, purchaseOrders, purchaseOrderLines, salesOrders, salesOrderLines, settings } from '../server/db/schema'

describe('schema exports', () => {
  it('exports all tables', () => {
    expect(items).toBeDefined()
    expect(suppliers).toBeDefined()
    expect(customers).toBeDefined()
    expect(purchaseOrders).toBeDefined()
    expect(purchaseOrderLines).toBeDefined()
    expect(salesOrders).toBeDefined()
    expect(salesOrderLines).toBeDefined()
    expect(settings).toBeDefined()
  })
})
