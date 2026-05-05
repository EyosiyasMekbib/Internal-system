<script setup lang="ts">
definePageMeta({ layout: 'default' })

const ecYear = ref(2017)
const ecMonth = ref(1)

const { data: report, refresh } = await useFetch('/api/reports/vat', {
  query: computed(() => ({ ecYear: ecYear.value, ecMonth: ecMonth.value }))
})

const months = [
  { value: 1, label: 'Meskerem (Sep/Oct)' },
  { value: 2, label: 'Tikimt (Oct/Nov)' },
  { value: 3, label: 'Hidar (Nov/Dec)' },
  { value: 4, label: 'Tahsas (Dec/Jan)' },
  { value: 5, label: 'Tir (Jan/Feb)' },
  { value: 6, label: 'Yekatit (Feb/Mar)' },
  { value: 7, label: 'Megabit (Mar/Apr)' },
  { value: 8, label: 'Miazia (Apr/May)' },
  { value: 9, label: 'Ginbot (May/Jun)' },
  { value: 10, label: 'Sene (Jun/Jul)' },
  { value: 11, label: 'Hamle (Jul/Aug)' },
  { value: 12, label: 'Nehase (Aug/Sep)' },
  { value: 13, label: 'Pagume (Sep)' },
]
</script>

<template>
  <div>
    <div class="px-8 pt-8 pb-6 border-b border-border flex items-center justify-between">
      <div>
        <h1 class="font-display text-2xl font-bold">VAT Declaration Report</h1>
        <p class="text-sm text-muted mt-1">Monthly VAT register according to Ethiopian Calendar</p>
      </div>
      <button class="bg-text text-bg px-4 py-2 text-sm font-medium hover:bg-red transition-colors print:hidden" onclick="window.print()">
        Print Report
      </button>
    </div>

    <div class="px-8 py-6 space-y-8">
      <!-- Filters -->
      <div class="flex gap-4 print:hidden">
        <label class="flex items-center gap-2 text-sm">
          <span class="text-muted">EC Year</span>
          <input type="number" v-model="ecYear" class="bg-surface border border-border px-2 py-1 outline-none focus:border-text w-24">
        </label>
        <label class="flex items-center gap-2 text-sm">
          <span class="text-muted">Month</span>
          <select v-model="ecMonth" class="bg-surface border border-border px-2 py-1 outline-none focus:border-text">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </label>
      </div>

      <div v-if="report">
        <div class="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 class="text-sm font-bold text-muted uppercase tracking-wide mb-3">Input VAT (Purchases)</h2>
            <KTable
              :columns="[
                { key: 'date', label: 'Date', width: '100px' },
                { key: 'supplierName', label: 'Supplier' },
                { key: 'vatAmount', label: 'VAT', numeric: true, width: '100px' }
              ]"
              :rows="report.inputVatEntries"
            >
              <template #cell-vatAmount="{ value }">{{ Number(value).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</template>
            </KTable>
          </div>
          
          <div>
            <h2 class="text-sm font-bold text-muted uppercase tracking-wide mb-3">Output VAT (Sales)</h2>
            <KTable
              :columns="[
                { key: 'date', label: 'Date', width: '100px' },
                { key: 'customerName', label: 'Customer' },
                { key: 'vatAmount', label: 'VAT', numeric: true, width: '100px' }
              ]"
              :rows="report.outputVatEntries"
            >
              <template #cell-vatAmount="{ value }">{{ Number(value).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</template>
            </KTable>
          </div>
        </div>

        <div class="max-w-md mx-auto border-t-2 border-border pt-4">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-muted">Total Output VAT (Sales)</span>
            <span class="font-mono">{{ Number(report.summary.totalOutputVat).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }} ETB</span>
          </div>
          <div class="flex justify-between text-sm mb-2">
            <span class="text-muted">Total Input VAT (Purchases)</span>
            <span class="font-mono">- {{ Number(report.summary.totalInputVat).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }} ETB</span>
          </div>
          <div class="flex justify-between font-bold text-lg border-t border-border pt-2">
            <span>Net VAT Payable</span>
            <span class="font-mono" :class="report.summary.netVatPayable >= 0 ? 'text-red' : 'text-green-600'">
              {{ Number(Math.abs(report.summary.netVatPayable)).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }} ETB
              <span class="text-xs font-normal text-muted ml-1">{{ report.summary.netVatPayable >= 0 ? 'Payable' : 'Refundable' }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>