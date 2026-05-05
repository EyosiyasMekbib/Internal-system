// ethiopian-date exports named functions (CJS), not a default export
import { toEthiopian as _ethToEthiopian, toGregorian as _ethToGregorian } from 'ethiopian-date'

export interface EcDate {
  year: number
  month: number
  day: number
}

export const EC_MONTHS = [
  { value: 1,  label: 'Meskerem (1)' },
  { value: 2,  label: 'Tikimt (2)' },
  { value: 3,  label: 'Hidar (3)' },
  { value: 4,  label: 'Tahsas (4)' },
  { value: 5,  label: 'Tir (5)' },
  { value: 6,  label: 'Yekatit (6)' },
  { value: 7,  label: 'Megabit (7)' },
  { value: 8,  label: 'Miazia (8)' },
  { value: 9,  label: 'Ginbot (9)' },
  { value: 10, label: 'Sene (10)' },
  { value: 11, label: 'Hamle (11)' },
  { value: 12, label: 'Nehase (12)' },
  { value: 13, label: 'Pagume (13)' },
]

export function toEthiopian(date: Date): EcDate {
  const [year, month, day] = _ethToEthiopian(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )
  return { year, month, day }
}

export function ecToGregorianIso(year: number, month: number, day: number): string {
  const [gy, gm, gd] = _ethToGregorian(year, month, day)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${gy}-${pad(gm)}-${pad(gd)}`
}

export function formatEcDate(date: Date): string {
  const { year, month, day } = toEthiopian(date)
  const monthName = EC_MONTHS.find(m => m.value === month)?.label.split(' ')[0] ?? month
  return `${day} ${monthName} ${year} ዓ.ም`
}
