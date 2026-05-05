import { describe, it, expect } from 'vitest'
import { calcLineVat, calcOrderTotals } from '../server/utils/vat'

describe('calcLineVat', () => {
  it('calculates 15% VAT on a line', () => {
    const result = calcLineVat(4, 29739.132)
    expect(result.subtotal).toBeCloseTo(118956.528)
    expect(result.vatAmount).toBeCloseTo(17843.479)
    expect(result.total).toBeCloseTo(136800.007)
  })

  it('rounds to 2 decimal places', () => {
    const result = calcLineVat(1, 100)
    expect(result.vatAmount).toBeCloseTo(15)
    expect(result.total).toBeCloseTo(115)
  })
})

describe('calcOrderTotals', () => {
  it('sums lines into order totals', () => {
    const lines = [
      { subtotal: 100, vatAmount: 15, total: 115 },
      { subtotal: 200, vatAmount: 30, total: 230 },
    ]
    const result = calcOrderTotals(lines)
    expect(result.subtotal).toBeCloseTo(300)
    expect(result.vatAmount).toBeCloseTo(45)
    expect(result.grandTotal).toBeCloseTo(345)
  })
})
