<script setup lang="ts">
defineProps<{
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
  return `${n.toLocaleString()} ETB` + (cents > 0 ? ` and ${cents}/100` : ' only')
}
</script>

<template>
  <div class="voucher-print hidden print:block font-[Arial] text-[11px] text-[#000] p-8 max-w-[210mm] mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-start mb-4">
      <div>
        <img src="/logo.png" alt="Katerina" class="h-14 mb-1" />
      </div>
      <div class="text-right text-[10px] leading-5">
        <div class="text-[14px] font-bold">ካተሪና ፍራልዲ</div>
        <div class="text-[14px] font-bold">Katerina Faraldi</div>
        <div>TIN 0007036896</div>
        <div>Sub City: Bole, Woreda: 12, House No.: New/38, 2nd Floor</div>
        <div>T. +251 973 023008</div>
      </div>
    </div>

    <!-- Title bar -->
    <div class="bg-[#222] text-white text-center text-[12px] font-bold py-1 mb-3">
      Purchase Order Voucher
    </div>

    <!-- Supplier info -->
    <table class="w-full border border-[#000] mb-3 text-[10px]" style="border-collapse: collapse">
      <tr>
        <td class="border border-[#000] px-2 py-1 w-1/2">
          <span class="font-bold">Supplier:</span> {{ order.supplier?.name }}
        </td>
        <td class="border border-[#000] px-2 py-1 w-1/2 text-right">
          <span class="font-bold">Date:</span> {{ order.date }}
        </td>
      </tr>
      <tr>
        <td class="border border-[#000] px-2 py-1">
          <span class="font-bold">TIN:</span> {{ order.supplier?.tin || '' }}
        </td>
        <td class="border border-[#000] px-2 py-1">
          <span class="font-bold">Voucher No.:</span> <span class="font-mono">{{ order.voucherNo || '' }}</span>
        </td>
      </tr>
    </table>

    <!-- Line items -->
    <table class="w-full border border-[#000] mb-3 text-[10px]" style="border-collapse: collapse">
      <thead>
        <tr class="bg-[#eee]">
          <th class="border border-[#000] px-1 py-1 text-left w-8">No.</th>
          <th class="border border-[#000] px-1 py-1 text-left">Description</th>
          <th class="border border-[#000] px-1 py-1 text-center w-16">Origin</th>
          <th class="border border-[#000] px-1 py-1 text-center w-16">Brand</th>
          <th class="border border-[#000] px-1 py-1 text-center w-12">Unit</th>
          <th class="border border-[#000] px-1 py-1 text-center w-12">Qty</th>
          <th class="border border-[#000] px-1 py-1 text-right w-24">Unit Price</th>
          <th class="border border-[#000] px-1 py-1 text-right w-28">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, i) in order.lines" :key="i">
          <td class="border border-[#000] px-1 py-1 text-center">{{ i + 1 }}</td>
          <td class="border border-[#000] px-1 py-1">{{ line.itemName }}</td>
          <td class="border border-[#000] px-1 py-1 text-center">{{ line.countryOfOrigin || '' }}</td>
          <td class="border border-[#000] px-1 py-1 text-center">{{ line.brandName || '' }}</td>
          <td class="border border-[#000] px-1 py-1 text-center">{{ line.itemUnit }}</td>
          <td class="border border-[#000] px-1 py-1 text-center font-mono">{{ line.qty }}</td>
          <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt(line.unitPrice) }}</td>
          <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt(line.total) }}</td>
        </tr>
        <tr v-for="n in Math.max(0, 6 - order.lines.length)" :key="`empty-${n}`">
          <td class="border border-[#000] px-1 py-3" colspan="8" />
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="7" class="border border-[#000] px-2 py-1 text-right font-bold">Subtotal</td>
          <td class="border border-[#000] px-2 py-1 text-right font-mono">{{ fmt(order.subtotal) }}</td>
        </tr>
        <tr>
          <td colspan="7" class="border border-[#000] px-2 py-1 text-right font-bold">VAT</td>
          <td class="border border-[#000] px-2 py-1 text-right font-mono">{{ fmt(order.vatAmount) }}</td>
        </tr>
        <tr>
          <td colspan="7" class="border border-[#000] px-2 py-1 text-right font-bold">Grand Total</td>
          <td class="border border-[#000] px-2 py-1 text-right font-mono font-bold">{{ fmt(order.grandTotal) }}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Amount in words -->
    <div class="border border-[#000] px-2 py-1 mb-3 text-[10px]">
      <span class="font-bold">Amount in Words: </span>
      {{ amountInWords(Number(order.grandTotal)) }}
    </div>

    <!-- Notes -->
    <div v-if="order.notes" class="border border-[#000] px-2 py-1 mb-3 text-[10px]">
      <span class="font-bold">Notes: </span>{{ order.notes }}
    </div>

    <!-- Signatures -->
    <table class="w-full border border-[#000] text-[10px]" style="border-collapse: collapse">
      <tr>
        <td class="border border-[#000] px-2 py-4 w-1/3 text-center">
          <div class="font-bold mb-4">Prepared by</div>
          <div class="border-t border-[#000] pt-1">Name &amp; Signature</div>
        </td>
        <td class="border border-[#000] px-2 py-4 w-1/3 text-center">
          <div class="font-bold mb-4">Approved by</div>
          <div class="border-t border-[#000] pt-1">Name &amp; Signature</div>
        </td>
        <td class="border border-[#000] px-2 py-4 w-1/3 text-center">
          <div class="font-bold mb-4">Received by</div>
          <div class="border-t border-[#000] pt-1">Name &amp; Signature</div>
        </td>
      </tr>
    </table>
  </div>
</template>

<style>
@media print {
  body * { visibility: hidden; }
  .voucher-print, .voucher-print * { visibility: visible; }
  .voucher-print { position: absolute; left: 0; top: 0; width: 100%; }
}
</style>
