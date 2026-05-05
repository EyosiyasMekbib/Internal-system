import EthiopianDate from 'ethiopian-date'

export interface EcDate {
  year: number
  month: number
  day: number
}

const EC_MONTH_NAMES: Record<number, string> = {
  1:  'መስከረም',
  2:  'ጥቅምት',
  3:  'ህዳር',
  4:  'ታህሳስ',
  5:  'ጥር',
  6:  'የካቲት',
  7:  'መጋቢት',
  8:  'ሚያዝያ',
  9:  'ግንቦት',
  10: 'ሰኔ',
  11: 'ሃምሌ',
  12: 'ነሃሴ',
  13: 'ጳጉሜ',
}

export function toEthiopian(date: Date): EcDate {
  const [year, month, day] = EthiopianDate.toEthiopian(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )
  return { year, month, day }
}

export function formatEcMonth(year: number, month: number): string {
  const monthName = EC_MONTH_NAMES[month]
  // In EC, months 1-12 have 30 days, month 13 has 5 or 6 (assuming 5 for standard label)
  const lastDay = month === 13 ? 5 : 30
  return `${monthName} 1-${lastDay}, ${year} ዓ.ም`
}

export function formatEcDate(date: Date): string {
  const { year, month, day } = toEthiopian(date)
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
}

export function ecMonthDateRange(year: number, month: number): { start: Date; end: Date } {
  // Convert EC first day of month to Gregorian
  const startDateStr = EthiopianDate.toEuropean(year, month, 1).join('-')
  const start = new Date(startDateStr)
  
  // Convert EC last day of month to Gregorian
  const lastDay = month === 13 ? 5 : 30
  const endDateStr = EthiopianDate.toEuropean(year, month, lastDay).join('-')
  const end = new Date(endDateStr)
  // Ensure we cover the entire last day
  end.setHours(23, 59, 59, 999)
  
  return { start, end }
}