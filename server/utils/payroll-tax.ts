/**
 * Payroll tax calculation utilities (Proclamation 1395/2017)
 */

/**
 * Calculate income tax based on taxable income
 * Uses Ethiopian income tax brackets from Proclamation 1395/2017
 */
export function calcIncomeTax(taxable: number): number {
  if (taxable <= 2000) return 0
  if (taxable <= 4000) return taxable * 0.15 - 300
  if (taxable <= 7000) return taxable * 0.20 - 500
  if (taxable <= 10000) return taxable * 0.25 - 850
  if (taxable <= 14000) return taxable * 0.30 - 1350
  return taxable * 0.35 - 2050
}

export interface PayslipInput {
  basicSalary: number
  transportAllowance: number
  overTime: number
  otherTaxableBenefit: number
}

export interface PayslipResult {
  basicSalary: number
  transportAllowance: number
  taxableTransportAllowance: number
  overTime: number
  otherTaxableBenefit: number
  totalTaxable: number
  taxWithheld: number
  costSharing: number
  employerPension: number
  netPay: number
}

/**
 * Calculate full payslip from employee salary components
 *
 * Calculations:
 * - Taxable transport allowance = max(0, transport - 600)
 * - Total taxable income = basic + taxableTransport + overtime + otherTaxable
 * - Tax withheld = calcIncomeTax(totalTaxable)
 * - Cost sharing (employee pension) = basic * 0.07
 * - Employer pension = basic * 0.11
 * - Net pay = gross - tax - costSharing (gross = basic + transport + overtime + otherTaxable)
 */
export function calcPayslip(input: PayslipInput): PayslipResult {
  const { basicSalary, transportAllowance, overTime, otherTaxableBenefit } = input

  // Transport allowance: only amount above 600 is taxable
  const taxableTransportAllowance = Math.max(0, transportAllowance - 600)

  // Total taxable income
  const totalTaxable = basicSalary + taxableTransportAllowance + overTime + otherTaxableBenefit

  // Calculate income tax
  const taxWithheld = calcIncomeTax(totalTaxable)

  // Pension deductions
  const costSharing = basicSalary * 0.07 // Employee contribution
  const employerPension = basicSalary * 0.11 // Employer contribution

  // Gross pay (all allowances)
  const grossPay = basicSalary + transportAllowance + overTime + otherTaxableBenefit

  // Net pay after all deductions
  const netPay = grossPay - taxWithheld - costSharing

  return {
    basicSalary,
    transportAllowance,
    taxableTransportAllowance: Math.round(taxableTransportAllowance * 100) / 100,
    overTime,
    otherTaxableBenefit,
    totalTaxable: Math.round(totalTaxable * 100) / 100,
    taxWithheld: Math.round(taxWithheld * 100) / 100,
    costSharing: Math.round(costSharing * 100) / 100,
    employerPension: Math.round(employerPension * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
  }
}
