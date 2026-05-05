<script setup lang="ts">
const props = defineProps<{
  order: {
    date: string
    fsNo: string
    subtotal: string
    vatAmount: string
    grandTotal: string
    customer: {
      name: string
      tin?: string
      vatRegNo?: string
    }
    lines: {
      itemName: string
      itemUnit: string
      qty: string
      unitPrice: string
      vatAmount: string
      total: string
    }[]
  }
}>()

const { data: appSettings } = await useFetch('/api/settings')
const mrcCode = computed(() => (appSettings.value as any)?.mrc_code ?? '')
const vatRate = computed(() => {
  const r = Number((appSettings.value as any)?.vat_rate ?? 0.15)
  return `${(r * 100).toFixed(0)}%`
})

function amountInWords(amount: number): string {
  const n = Math.floor(amount)
  const cents = Math.round((amount - n) * 100)
  return `${n.toLocaleString()} ETB` + (cents > 0 ? ` and ${cents}/100` : ' only')
}
</script>

<template>
  <div class="invoice-print hidden print:block font-[Arial] text-[11px] text-[#000] p-8 max-w-[210mm] mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-start mb-4">
      <div>
        <img src="/logo.png" alt="Katerina" class="h-14 mb-1" />
      </div>
      <div class="text-right text-[10px] leading-5">
        <div class="text-[14px] font-bold">ካተሪና ፍራልዲ</div>
        <div class="text-[14px] font-bold">Katerina Faraldi</div>
        <div>TIN 0007036896</div>
        <div>VAT 14234090819</div>
        <div>Sub City: Bole, Woreda: 12, House No.: New/38, 2nd Floor</div>
        <div>Registration Date: 03/11/2018</div>
        <div>T. +251 973 023008</div>
      </div>
    </div>

    <!-- Title bar -->
    <div class="bg-[#222] text-white text-center text-[12px] font-bold py-1 mb-3">
      Attachment Cash Invoice
    </div>

    <!-- Customer info block -->
    <table class="w-full border border-[#000] mb-3 text-[10px]" style="border-collapse: collapse">
      <tr>
        <td class="border border-[#000] px-2 py-1 w-1/2">
          <span class="font-bold">ለ/To:</span> {{ order.customer?.name }}
        </td>
        <td class="border border-[#000] px-2 py-1 w-1/2 text-right">
          <span class="font-bold">ቁጥ / Date:</span> {{ order.date }}
        </td>
      </tr>
      <tr>
        <td class="border border-[#000] px-2 py-1">
          <div class="text-[9px] text-gray-600">የግዥ የታክስ ክፋይ ም.ቁ / Customer's TIN No.:</div>
          <div class="font-mono">{{ order.customer?.tin || '' }}</div>
        </td>
        <td class="border border-[#000] px-2 py-1">
          <div class="text-[9px] text-gray-600">የፊስካል ደ.ቁ / FS No.:</div>
          <div class="font-mono font-bold">{{ order.fsNo }}</div>
        </td>
      </tr>
      <tr>
        <td class="border border-[#000] px-2 py-1">
          <div class="text-[9px] text-gray-600">የግዥ የት.እ.ታ ቁጥር / Customer's VAT Reg. No.:</div>
          <div class="font-mono">{{ order.customer?.vatRegNo || '' }}</div>
        </td>
        <td class="border border-[#000] px-2 py-1" />
      </tr>
      <tr>
        <td class="border border-[#000] px-2 py-1" colspan="2">
          <div class="text-[9px] text-gray-600">የተመዝገበበት ቀን / Date of Registration:</div>
        </td>
      </tr>
    </table>

    <!-- Line items -->
    <table class="w-full border border-[#000] mb-3 text-[10px]" style="border-collapse: collapse">
      <thead>
        <tr class="bg-[#eee]">
          <th class="border border-[#000] px-1 py-1 text-left w-8">ተ.ቁ/ No.</th>
          <th class="border border-[#000] px-1 py-1 text-left">የዕቃው ዓይነት/ Description</th>
          <th class="border border-[#000] px-1 py-1 text-center w-14">መለኪያ/ Unit</th>
          <th class="border border-[#000] px-1 py-1 text-center w-14">ብዛት/ Qty</th>
          <th class="border border-[#000] px-1 py-1 text-right w-24">የአንዱ ዋጋ/ Unit Price</th>
          <th class="border border-[#000] px-1 py-1 text-right w-28">ጠቅላላ ዋጋ/ Total Price</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, i) in order.lines" :key="i">
          <td class="border border-[#000] px-1 py-1 text-center">{{ i + 1 }}</td>
          <td class="border border-[#000] px-1 py-1">{{ line.itemName }}</td>
          <td class="border border-[#000] px-1 py-1 text-center">{{ line.itemUnit }}</td>
          <td class="border border-[#000] px-1 py-1 text-center font-mono">{{ line.qty }}</td>
          <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ Number(line.unitPrice).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
          <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ Number(line.total).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
        </tr>
        <tr v-for="n in Math.max(0, 8 - order.lines.length)" :key="`empty-${n}`">
          <td class="border border-[#000] px-1 py-3" colspan="6" />
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="border border-[#000] px-2 py-1 text-right font-bold">ድምር / Total</td>
          <td class="border border-[#000] px-2 py-1 text-right font-mono">{{ Number(order.subtotal).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
        </tr>
        <tr>
          <td colspan="5" class="border border-[#000] px-2 py-1 text-right font-bold">ተ.እ.ታ ({{ vatRate }}) / VAT ({{ vatRate }})</td>
          <td class="border border-[#000] px-2 py-1 text-right font-mono">{{ Number(order.vatAmount).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
        </tr>
        <tr>
          <td colspan="5" class="border border-[#000] px-2 py-1 text-right font-bold">ጠቅላላ ዋጋ / Grand Total</td>
          <td class="border border-[#000] px-2 py-1 text-right font-mono font-bold">{{ Number(order.grandTotal).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Amount in words -->
    <div class="border border-[#000] px-2 py-1 mb-3 text-[10px]">
      <span class="font-bold">የገንዘቡ መጠን በፊደል / Amount in Words: </span>
      {{ amountInWords(Number(order.grandTotal)) }}
    </div>

    <!-- Payment mode + signature -->
    <table class="w-full border border-[#000] mb-2 text-[10px]" style="border-collapse: collapse">
      <tr>
        <td class="border border-[#000] px-2 py-1 w-1/3" rowspan="2">
          <span class="font-bold">የክፍያ ሁኔታ / Mode of Payment:</span>
        </td>
        <td class="border border-[#000] px-2 py-1">
          <span class="font-bold">በካሽ / Cash:</span> ☐
        </td>
        <td class="border border-[#000] px-2 py-1" colspan="2" />
      </tr>
      <tr>
        <td class="border border-[#000] px-2 py-1">
          <span class="font-bold">በቼክ / Check:</span> ☐
        </td>
        <td class="border border-[#000] px-2 py-1">
          <span class="font-bold">የቼክ ቁጥር / Cheque No.:</span>
        </td>
        <td class="border border-[#000] px-2 py-1">
          <span class="font-bold">ያፀደቀው / Approved by:</span>
        </td>
      </tr>
    </table>

    <div class="border border-[#000] px-2 py-1 text-[10px]">
      <span class="font-bold">የገንዘቡ ተቀባይ ስም እና ፊርማ / Cashier's Name &amp; Signature:</span>
    </div>

    <!-- Footer -->
    <div class="mt-2 text-[8px] text-center border-t border-[#000] pt-1 flex justify-between">
      <span>ካሽ ፊስካል ወይም ተመላሽ ደረሰኝ ካልተሰጠ ዋጋ የለውም</span>
      <span>INVALID WITHOUT FISCAL OR REFUND RECEIPT ATTACHED</span>
    </div>
    <div class="text-[8px] text-right">
      MACHINE REGISTRATION CODE: <span class="font-mono">{{ mrcCode }}</span>
    </div>
  </div>
</template>

<style>
@media print {
  body * { visibility: hidden; }
  .invoice-print, .invoice-print * { visibility: visible; }
  .invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
}
</style>
