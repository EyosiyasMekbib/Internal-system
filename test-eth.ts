import EthiopianDate from 'ethiopian-date'
import * as eth from 'ethiopian-date'
console.log('EthiopianDate:', typeof EthiopianDate)
console.log('eth:', Object.keys(eth))
if (typeof EthiopianDate === 'object') {
  console.log('EthiopianDate keys:', Object.keys(EthiopianDate))
}
