<script setup lang="ts">
const props = defineProps<{
  order: {
    date: string
    voucherNo?: string
    subtotal: string
    vatAmount: string
    grandTotal: string
    notes?: string
    supplier: {
      name: string
      tin?: string
      vatRegNo?: string
    }
    lines: {
      itemName: string
      itemUnit: string
      countryOfOrigin?: string
      brandName?: string
      qty: string
      unitPrice: string
      total: string
    }[]
  }
}>()

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })
}

function amountInWords(amount: number): string {
  const n = Math.floor(amount)
  const cents = Math.round((amount - n) * 100)
  return `${n.toLocaleString()} ETB` + (cents > 0 ? ` and ${cents}/100` : ' ONLY')
}

const formattedDate = computed(() => {
  if (!props.order.date) return ''
  const d = new Date(props.order.date)
  if (isNaN(d.getTime())) return props.order.date
  return d.toISOString().split('T')[0]
})
</script>

<template>
  <div class="voucher-print print:block font-[Arial] text-[11px] text-black w-full" style="padding: 0; background: white; margin-top: 10px;">
    <!-- Header -->
    <div class="flex justify-between items-end mb-2 px-2">
      <div class="mb-1">
        <img src="/logo.png" alt="Katerina" class="h-16" />
      </div>
      <div class="text-right leading-[1.2] text-[10px]">
        <div class="font-bold text-[14px]">ካተሪና ፍራልዲ</div>
        <div class="font-bold text-[14px] mb-1">Katerina Faraldi</div>
        <div><span class="font-bold">TIN:</span> 0007036896</div>
        <div>Sub City: Bole, Woreda: 12</div>
        <div>House No.: New/38, 2nd Floor</div>
        <div><span class="font-bold">Tel:</span> +251 973 023008</div>
      </div>
    </div>

    <!-- Title bar -->
    <div class="text-center font-bold pb-1 pt-1 mb-2">
      <div class="text-[15px] uppercase tracking-widest mt-0.5 font-extrabold underline underline-offset-4">Purchase Order Voucher</div>
    </div>

    <!-- Supplier info block -->
    <table class="w-full border-[2px] border-black mb-2" style="border-collapse: collapse">
      <tr>
        <td class="border-b border-r border-black p-2 font-bold w-[15%]">Supplier:</td>
        <td class="border-b border-r border-black p-2 font-bold w-[45%] uppercase">{{ order.supplier?.name }}</td>
        <td class="border-b border-r border-black p-2 font-bold w-[12%]">Date:</td>
        <td class="border-b border-black p-2 font-bold font-mono text-center w-[28%]">{{ formattedDate }}</td>
      </tr>
      <tr>
        <td class="border-r border-black p-2 font-bold text-[10px]">TIN:</td>
        <td class="border-r border-black p-2 font-bold font-mono">{{ order.supplier?.tin || '' }}</td>
        <td class="border-r border-black p-2 font-bold text-[10px]">Voucher No.:</td>
        <td class="p-2 font-bold font-mono text-[14px] text-center">{{ order.voucherNo || '' }}</td>
      </tr>
    </table>

    <!-- Line items Table -->
    <table class="w-full border-[2px] border-black mb-2 align-top" style="border-collapse: collapse">
      <thead>
        <tr>
          <th class="border border-black px-1 py-1 text-center w-8 font-bold text-[10px]">No.</th>
          <th class="border border-black px-1 py-1 text-left font-bold text-[10px]">Description</th>
          <th class="border border-black px-1 py-1 text-center w-14 font-bold text-[10px]">Origin</th>
          <th class="border border-black px-1 py-1 text-center w-14 font-bold text-[10px]">Brand</th>
          <th class="border border-black px-1 py-1 text-center w-12 font-bold text-[10px]">Unit</th>
          <th class="border border-black px-1 py-1 text-center w-14 font-bold text-[10px]">Qty</th>
          <th class="border border-black px-1 py-1 text-right w-20 font-bold text-[10px]">Unit Price</th>
          <th class="border border-black px-1 py-1 text-right w-24 font-bold text-[10px]">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, i) in order.lines" :key="i" class="h-6 text-[10px]">
          <td class="border border-black px-1 py-0.5 text-center font-mono">{{ i + 1 }}</td>
          <td class="border border-black px-1 py-0.5">{{ line.itemName }}</td>
          <td class="border border-black px-1 py-0.5 text-center uppercase text-[9px]">{{ line.countryOfOrigin || '' }}</td>
          <td class="border border-black px-1 py-0.5 text-center text-[9px]">{{ line.brandName || '' }}</td>
          <td class="border border-black px-1 py-0.5 text-center font-bold">{{ line.itemUnit }}</td>
          <td class="border border-black px-1 py-0.5 text-center font-mono font-bold">{{ line.qty }}</td>
          <td class="border border-black px-1 py-0.5 text-right font-mono">{{ fmt(line.unitPrice) }}</td>
          <td class="border border-black px-1 py-0.5 text-right font-mono">{{ fmt(line.total) }}</td>
        </tr>
        <tr v-for="n in Math.max(0, 10 - order.lines.length)" :key="`empty-${n}`" class="h-6">
          <td class="border border-black px-1 py-0.5"></td>
          <td class="border border-black px-1 py-0.5"></td>
          <td class="border border-black px-1 py-0.5"></td>
          <td class="border border-black px-1 py-0.5"></td>
          <td class="border border-black px-1 py-0.5"></td>
          <td class="border border-black px-1 py-0.5"></td>
          <td class="border border-black px-1 py-0.5"></td>
          <td class="border border-black px-1 py-0.5"></td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6" class="border-0"></td>
          <td class="border border-black px-2 py-2 text-right font-bold bg-gray-50 print:bg-gray-50" style="-webkit-print-color-adjust: exact;">Subtotal</td>
          <td class="border border-black px-2 py-2 text-right font-mono font-bold">{{ fmt(order.subtotal) }}</td>
        </tr>
        <tr>
          <td colspan="6" class="border-0"></td>
          <td class="border border-black px-2 py-2 text-right font-bold bg-gray-50 print:bg-gray-50" style="-webkit-print-color-adjust: exact;">VAT</td>
          <td class="border border-black px-2 py-2 text-right font-mono font-bold">{{ fmt(order.vatAmount) }}</td>
        </tr>
        <tr>
          <td colspan="6" class="border-0"></td>
          <td class="border border-black px-2 py-2 text-right font-bold text-[13px] bg-gray-50 print:bg-gray-50" style="-webkit-print-color-adjust: exact;">Grand Total</td>
          <td class="border border-black px-2 py-2 text-right font-mono font-bold text-[13px]">{{ fmt(order.grandTotal) }}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Amount in words -->
    <div class="mb-2 mt-1 px-1">
      <span class="font-bold text-[11px]">Amount in Words:</span>
      <span class="font-mono uppercase font-bold text-[10px] underline underline-offset-4 ml-2">
        {{ amountInWords(Number(order.grandTotal)) }}
      </span>
    </div>

    <!-- Signatures -->
    <table class="w-full mb-2 mt-4" style="border-collapse: collapse">
      <tr>
        <td class="w-[33%] align-top h-[45px] relative text-center">
          <div class="flex flex-col h-full items-center">
            <div class="font-bold text-[11px] mb-4 uppercase">Prepared by</div>
            <div class="border-b border-black w-[80%]"></div>
            <div class="text-[9px] mt-1">Name & Signature</div>
          </div>
        </td>
        <td class="w-[33%] align-top h-[45px] relative text-center">
          <div class="flex flex-col h-full items-center">
            <div class="font-bold text-[11px] mb-4 uppercase">Approved by</div>
            <div class="border-b border-black w-[80%]"></div>
            <div class="text-[9px] mt-1">Name & Signature</div>
          </div>
        </td>
        <td class="w-[34%] align-top h-[45px] relative text-center">
          <div class="flex flex-col h-full items-center">
            <div class="font-bold text-[11px] mb-4 uppercase">Received by</div>
            <div class="border-b border-black w-[80%]"></div>
            <div class="text-[9px] mt-1">Name & Signature</div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</template>
