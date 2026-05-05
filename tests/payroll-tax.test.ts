import { describe, it, expect } from 'vitest'
import { calcIncomeTax, calcPayslip } from '../server/utils/payroll-tax'

describe('Income Tax Calculation (Proclamation 1395/2017)', () => {
  it('should return 0 tax for income <= 2000', () => {
    expect(calcIncomeTax(0)).toBe(0)
    expect(calcIncomeTax(600)).toBe(0)
    expect(calcIncomeTax(2000)).toBe(0)
  })

  it('should apply 15% rate for income 2001-4000', () => {
    // At 2001: tax = 2001 * 0.15 - 300 = 0.15
    expect(Math.round(calcIncomeTax(2001) * 100) / 100).toBe(0.15)

    // At 3000: tax = 3000 * 0.15 - 300 = 150
    expect(calcIncomeTax(3000)).toBe(150)

    // At 4000: tax = 4000 * 0.15 - 300 = 300
    expect(calcIncomeTax(4000)).toBe(300)
  })

  it('should apply 20% rate for income 4001-7000', () => {
    // At 4001: tax = 4001 * 0.20 - 500 = 300.2
    expect(Math.round(calcIncomeTax(4001) * 100) / 100).toBe(300.2)

    // At 7000: tax = 7000 * 0.20 - 500 = 900
    expect(calcIncomeTax(7000)).toBe(900)
  })

  it('should apply 25% rate for income 7001-10000', () => {
    // At 7001: tax = 7001 * 0.25 - 850 = 900.25
    expect(Math.round(calcIncomeTax(7001) * 100) / 100).toBe(900.25)

    // At 10000: tax = 10000 * 0.25 - 850 = 1650
    expect(calcIncomeTax(10000)).toBe(1650)
  })

  it('should apply 30% rate for income 10001-14000', () => {
    // At 10001: tax = 10001 * 0.30 - 1350 = 1650.3
    expect(Math.round(calcIncomeTax(10001) * 100) / 100).toBe(1650.3)

    // At 14000: tax = 14000 * 0.30 - 1350 = 2850
    expect(calcIncomeTax(14000)).toBe(2850)
  })

  it('should apply 35% rate for income > 14000', () => {
    // At 14001: tax = 14001 * 0.35 - 2050 = 2850.35
    expect(Math.round(calcIncomeTax(14001) * 100) / 100).toBe(2850.35)

    // At 20000: tax = 20000 * 0.35 - 2050 = 4950
    expect(calcIncomeTax(20000)).toBe(4950)
  })
})

describe('Payslip Calculation', () => {
  it('should correctly calculate a payslip with basic salary only', () => {
    const result = calcPayslip({
      basicSalary: 5000,
      transportAllowance: 0,
      overTime: 0,
      otherTaxableBenefit: 0,
    })

    // totalTaxable = 5000
    // tax = 5000 * 0.20 - 500 = 500
    expect(result.basicSalary).toBe(5000)
    expect(result.totalTaxable).toBe(5000)
    expect(result.taxWithheld).toBe(500)

    // costSharing = 5000 * 0.07 = 350
    expect(result.costSharing).toBe(350)

    // employerPension = 5000 * 0.11 = 550
    expect(result.employerPension).toBe(550)

    // netPay = 5000 - 500 - 350 = 4150
    expect(result.netPay).toBe(4150)
  })

  it('should handle transport allowance with only amount above 600 taxable', () => {
    const result = calcPayslip({
      basicSalary: 3000,
      transportAllowance: 1000, // 400 taxable
      overTime: 0,
      otherTaxableBenefit: 0,
    })

    // taxableTransport = max(0, 1000 - 600) = 400
    expect(result.taxableTransportAllowance).toBe(400)

    // totalTaxable = 3000 + 400 = 3400
    expect(result.totalTaxable).toBe(3400)

    // tax = 3400 * 0.15 - 300 = 210
    expect(result.taxWithheld).toBe(210)

    // costSharing = 3000 * 0.07 = 210
    expect(result.costSharing).toBe(210)

    // netPay = (3000 + 1000) - 210 - 210 = 3580
    expect(result.netPay).toBe(3580)
  })

  it('should include overtime and other benefits in taxable income', () => {
    const result = calcPayslip({
      basicSalary: 4000,
      transportAllowance: 500, // Not taxable (< 600)
      overTime: 500,
      otherTaxableBenefit: 200,
    })

    // taxableTransport = max(0, 500 - 600) = 0
    expect(result.taxableTransportAllowance).toBe(0)

    // totalTaxable = 4000 + 0 + 500 + 200 = 4700
    expect(result.totalTaxable).toBe(4700)

    // tax = 4700 * 0.20 - 500 = 440
    expect(result.taxWithheld).toBe(440)

    // netPay = (4000 + 500 + 500 + 200) - 440 - (4000 * 0.07) = 5200 - 440 - 280 = 4480
    expect(result.netPay).toBe(4480)
  })

  it('should correctly calculate payslip at high salary levels', () => {
    const result = calcPayslip({
      basicSalary: 15000,
      transportAllowance: 800,
      overTime: 1000,
      otherTaxableBenefit: 500,
    })

    // totalTaxable = 15000 + 200 + 1000 + 500 = 16700
    expect(result.totalTaxable).toBe(16700)

    // tax = 16700 * 0.35 - 2050 = 3795
    expect(result.taxWithheld).toBe(3795)

    // costSharing = 15000 * 0.07 = 1050
    expect(result.costSharing).toBe(1050)

    // employerPension = 15000 * 0.11 = 1650
    expect(result.employerPension).toBe(1650)

    // netPay = (15000 + 800 + 1000 + 500) - 3795 - 1050 = 17300 - 4845 = 12455
    expect(result.netPay).toBe(12455)
  })

  it('should round all monetary values to 2 decimal places', () => {
    const result = calcPayslip({
      basicSalary: 3333.33,
      transportAllowance: 666.67,
      overTime: 0,
      otherTaxableBenefit: 0,
    })

    // All values should have max 2 decimal places
    Object.values(result).forEach((val) => {
      if (typeof val === 'number' && !Number.isInteger(val)) {
        const decimalPlaces = String(val).split('.')[1]?.length || 0
        expect(decimalPlaces).toBeLessThanOrEqual(2)
      }
    })
  })
})
