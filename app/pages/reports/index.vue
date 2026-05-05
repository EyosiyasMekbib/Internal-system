<script setup lang="ts">
definePageMeta({ layout: 'default' })

const now = new Date()
// Default to current EC month — approximate (Gregorian month - 8 offset for EC)
const defaultEcYear = ref(2018)
const defaultEcMonth = ref(6)

const ecYear = ref(defaultEcYear.value)
const ecMonth = ref(defaultEcMonth.value)

const { data: report, refresh } = await useFetch(
  () => `/api/reports/vat-register?ec_year=${ecYear.value}&ec_month=${ecMonth.value}`
)

const columns = [
  { key: 'sn',           label: 'ተ.ቁ',      width: '50px' },
  { key: 'itemName',     label: 'Item' },
  { key: 'countryOfOrigin', label: 'Origin', width: '90px' },
  { key: 'brandName',    label: 'Brand',     width: '110px' },
  { key: 'unit',         label: 'Unit',      width: '60px' },
  { key: 'qty',          label: 'Qty',       numeric: true, width: '70px' },
  { key: 'unitSalePrice',label: 'Sale Price', numeric: true, width: '110px' },
  { key: 'vatAmount',    label: 'VAT (15%)', numeric: true, width: '100px' },
  { key: 'grandTotal',   label: 'Total',     numeric: true, width: '110px' },
  { key: 'fsNo',         label: 'FS No',     width: '130px' },
  { key: 'saleDate',     label: 'Date (EC)', width: '140px' },
]

const months = [
  { value: 1,  label: 'መስከረም (1)' },
  { value: 2,  label: 'ጥቅምት (2)' },
  { value: 3,  label: 'ህዳር (3)' },
  { value: 4,  label: 'ታህሳስ (4)' },
  { value: 5,  label: 'ጥር (5)' },
  { value: 6,  label: 'የካቲት (6)' },
  { value: 7,  label: 'መጋቢት (7)' },
  { value: 8,  label: 'ሚያዝያ (8)' },
  { value: 9,  label: 'ግንቦት (9)' },
  { value: 10, label: 'ሰኔ (10)' },
  { value: 11, label: 'ሐምሌ (11)' },
  { value: 12, label: 'ነሐሴ (12)' },
]

function fmt(n: number) {
  return n.toLocaleString('en-ET', { minimumFractionDigits: 2 })
}

async function downloadExcel() {
  const url = `/api/reports/vat-register-export?ec_year=${ecYear.value}&ec_month=${ecMonth.value}`
  const a = document.createElement('a')
  a.href = url
  a.download = `vat-register-${ecYear.value}-${ecMonth.value}.xlsx`
  a.click()
}
</script>

<template>
  <div>
    <KPageHeader title="VAT Register" subtitle="Monthly ERCA sales report" />

    <div class="px-8 py-6">
      <!-- Controls -->
      <div class="flex items-end gap-4 mb-6">
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">EC Year</label>
          <input
            v-model.number="ecYear"
            type="number"
            min="2010"
            max="2030"
            class="w-28 bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text"
            @change="refresh()"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">EC Month</label>
          <select
            v-model.number="ecMonth"
            class="bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text"
            @change="refresh()"
          >
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <button
          class="flex items-center gap-2 border border-text text-text px-4 py-2 text-sm font-medium hover:bg-text hover:text-bg transition-colors"
          @click="downloadExcel"
        >
          ↓ Export ERCA Excel
        </button>
      </div>

      <!-- Header info -->
      <div v-if="report" class="bg-surface border border-border px-4 py-3 mb-4 text-sm">
        <span class="font-medium">{{ (report as any).header.company }}</span>
        <span class="text-muted mx-2">·</span>
        <span class="font-mono text-xs">TIN {{ (report as any).header.tin }}</span>
        <span class="text-muted mx-2">·</span>
        <span>{{ (report as any).header.monthLabel }}</span>
        <span class="text-muted mx-2">·</span>
        <span class="text-muted">{{ (report as any).rows?.length ?? 0 }} lines</span>
      </div>

      <!-- Table -->
      <KTable :columns="columns" :rows="(report as any)?.rows ?? []" empty-message="No sales in this period." />

      <!-- Totals row -->
      <div v-if="report && (report as any).totals" class="mt-2 flex justify-end">
        <div class="w-80 border border-border text-sm">
          <div class="flex justify-between px-4 py-2 border-b border-border">
            <span class="text-muted">Total Subtotal</span>
            <span class="font-mono">{{ fmt((report as any).totals.subtotal) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2 border-b border-border">
            <span class="text-muted">Total VAT</span>
            <span class="font-mono">{{ fmt((report as any).totals.vat) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2 font-medium">
            <span>Grand Total</span>
            <span class="font-mono">{{ fmt((report as any).totals.total) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
