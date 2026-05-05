<script setup lang="ts">
definePageMeta({ layout: 'default' })

const ecYear = ref(2018)
const ecMonth = ref(6)

const { data: report, refresh } = await useFetch('/api/reports/vat-register', {
  query: computed(() => ({ ec_year: ecYear.value, ec_month: ecMonth.value }))
})

const months = [
  { value: 1,  label: 'Meskerem (Sep/Oct)' },
  { value: 2,  label: 'Tikimt (Oct/Nov)' },
  { value: 3,  label: 'Hidar (Nov/Dec)' },
  { value: 4,  label: 'Tahsas (Dec/Jan)' },
  { value: 5,  label: 'Tir (Jan/Feb)' },
  { value: 6,  label: 'Yekatit (Feb/Mar)' },
  { value: 7,  label: 'Megabit (Mar/Apr)' },
  { value: 8,  label: 'Miazia (Apr/May)' },
  { value: 9,  label: 'Ginbot (May/Jun)' },
  { value: 10, label: 'Sene (Jun/Jul)' },
  { value: 11, label: 'Hamle (Jul/Aug)' },
  { value: 12, label: 'Nehase (Aug/Sep)' },
  { value: 13, label: 'Pagume (Sep)' },
]

function fmt(n: string | number | null | undefined) {
  return Number(n || 0).toLocaleString('en-ET', { minimumFractionDigits: 2 })
}

const ecMonthName = computed(() => months.find(m => m.value === ecMonth.value)?.label.split(' ')[0] ?? '')
</script>

<template>
  <div>
    <!-- Screen controls -->
    <div class="px-8 pt-8 pb-6 border-b border-border flex items-center justify-between print:hidden">
      <div>
        <h1 class="font-display text-2xl font-bold">VAT Sales Summary</h1>
        <p class="text-sm text-muted mt-1">Monthly VAT register — Ethiopian Calendar</p>
      </div>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-sm">
          <span class="text-muted">EC Year</span>
          <input type="number" v-model="ecYear" class="bg-surface border border-border px-2 py-1 outline-none focus:border-text w-24" />
        </label>
        <label class="flex items-center gap-2 text-sm">
          <span class="text-muted">Month</span>
          <select v-model="ecMonth" class="bg-surface border border-border px-2 py-1 outline-none focus:border-text">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </label>
        <a
          :href="`/api/reports/vat-register-export?ec_year=${ecYear}&ec_month=${ecMonth}`"
          class="bg-surface border border-border px-4 py-2 text-sm font-medium hover:bg-surface2 transition-colors"
        >
          Export Excel
        </a>
        <button
          class="bg-text text-bg px-4 py-2 text-sm font-medium hover:bg-red transition-colors"
          onclick="window.print()"
        >
          Print
        </button>
      </div>
    </div>

    <!-- Print / screen report -->
    <div v-if="report" class="p-6 print:p-4">
      <!-- Company header block -->
      <div class="mb-3 print:mb-2">
        <div class="font-bold text-[13px]">{{ (report as any).header.company }}</div>
        <div class="text-[12px]">VAT Sales Summary</div>
        <div class="text-[11px]">From {{ (report as any).header.monthLabel }}</div>
        <div class="text-[11px]">TIN {{ (report as any).header.tin }}</div>
      </div>

      <!-- Amharic title row -->
      <div class="border border-[#000] px-2 py-1 text-[10px] mb-0 font-medium bg-[#f5f5f5]">
        ከ {{ ecMonthName }} 01/{{ ecYear }} ዓ.ም እስከ {{ ecMonthName }} 30/{{ ecYear }} ዓ.ም የተከናወነ የእያንዳንዱ ሽያጭ መረጃ መመዝገቢያ ቅጽ
      </div>

      <!-- 14-column register table -->
      <table class="w-full text-[9px] border border-[#000]" style="border-collapse: collapse">
        <thead>
          <tr class="bg-[#d3d3d3]">
            <th class="border border-[#000] px-1 py-1 text-center w-6">ተ.ቁ</th>
            <th class="border border-[#000] px-1 py-1 text-left min-w-[100px]">የተሸጠው የዕቃ መጠሪያ (A)</th>
            <th class="border border-[#000] px-1 py-1 text-left w-16">የስሪት ሀገር (B)</th>
            <th class="border border-[#000] px-1 py-1 text-left w-16">Brand Name (C)</th>
            <th class="border border-[#000] px-1 py-1 text-center w-10">መለኪያ</th>
            <th class="border border-[#000] px-1 py-1 text-right w-10">ብዛት (D)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-20">የአንዱ አማካይ ግዢ ዋጋ (E)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-20">የአንዱ ሽያጭ ዋጋ ከ ተ.እ.ታ በፊት (F)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-16">የተ.እ.ታ (G)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-20">ጠቅላላ ዋጋ ታክስ ጨምሮ H(F+G)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-20">ጠቅላላ ዋጋ ተ.እ.ታ ጨምሮ K</th>
            <th class="border border-[#000] px-1 py-1 text-center w-16">የሽያጭ ደረሰኝ ቁጥር (FS No.) (J)</th>
            <th class="border border-[#000] px-1 py-1 text-center w-16">ሽያጩ የተከናወነበት ቀን (J)</th>
            <th class="border border-[#000] px-1 py-1 text-center w-16">MRC (K)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in (report as any).rows" :key="row.sn" class="hover:bg-[#fafafa]">
            <td class="border border-[#000] px-1 py-0.5 text-center">{{ row.sn }}</td>
            <td class="border border-[#000] px-1 py-0.5">{{ row.itemName }}</td>
            <td class="border border-[#000] px-1 py-0.5">{{ row.countryOfOrigin }}</td>
            <td class="border border-[#000] px-1 py-0.5">{{ row.brandName }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-center">{{ row.unit }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.qty) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.costPrice) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.unitPrice) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.vatAmount) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.lineTotal) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.lineTotalWithVat) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-center font-mono">{{ row.fsNo }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-center">{{ row.saleDate }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-center font-mono">{{ row.mrcCode }}</td>
          </tr>
          <!-- Totals row -->
          <tr class="bg-[#eee] font-bold">
            <td colspan="5" class="border border-[#000] px-2 py-1 text-right">ድምር / Totals</td>
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.qty) }}</td>
            <td class="border border-[#000] px-1 py-1" />
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.subtotal) }}</td>
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.vat) }}</td>
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.total) }}</td>
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.total) }}</td>
            <td colspan="3" class="border border-[#000] px-1 py-1" />
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="px-8 py-12 text-center text-muted text-sm">
      No data for selected period.
    </div>
  </div>
</template>

<style>
@media print {
  .print\:hidden { display: none !important; }
}
</style>