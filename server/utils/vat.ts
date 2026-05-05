const VAT_RATE = 0.15

export function calcLineVat(qty: number, unitPrice: number) {
  const subtotal = qty * unitPrice
  const vatAmount = subtotal * VAT_RATE
  const total = subtotal + vatAmount
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

export function calcOrderTotals(lines: { subtotal: number; vatAmount: number; total: number }[]) {
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0)
  const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0)
  const grandTotal = lines.reduce((s, l) => s + l.total, 0)
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  }
}