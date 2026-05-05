import EthiopianDate from 'ethiopian-date'

const ecYear = 2018
const ecMonth = 6

const [y1, m1, d1] = EthiopianDate.toEuropean(ecYear, ecMonth, 1)
const startDateStr = `${y1}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}T00:00:00+03:00`
console.log('toEuropean start:', y1, m1, d1)

const start = new Date(y1, m1 - 1, d1)
const startStr = start.toISOString().split('T')[0]
console.log('startStr (wrong?):', startStr)

const correctStartStr = `${y1}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`
console.log('correct startStr:', correctStartStr)

