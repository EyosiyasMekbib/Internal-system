<script setup lang="ts">
const { order } = defineProps<{
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

const { data: appSettings } = useFetch('/api/settings')
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

// Format the date properly for display
const formattedDate = computed(() => {
  if (!order?.date) return ''
  const d = new Date(order.date)
  if (isNaN(d.getTime())) return order.date
  return d.toISOString().split('T')[0]
})
</script>

<template>
  <div class="invoice-print block print:block font-[Arial] text-[12px] text-black w-full" style="padding: 0; background: white;">
    <!-- Header -->
    <div class="flex justify-between items-start mb-2">
      <div class="pt-1">
        <img src="/logo.png" alt="Katerina" class="h-16" />
      </div>
      <div class="text-right leading-[1.2] text-[11px]">
        <div class="font-bold text-[14px]">ካተሪና ፍራልዲ</div>
        <div class="font-bold text-[14px] mb-1">Katerina Faraldi</div>
        <div><span class="font-bold">TIN:</span> 0007036896</div>
        <div><span class="font-bold">VAT Reg No:</span> 14234090819</div>
        <div>Sub City: Bole, Woreda: 12</div>
        <div>House No.: New/38, 2nd Floor</div>
        <div>Registration Date: 03/11/2018</div>
        <div><span class="font-bold">Tel:</span> +251 973 023008</div>
      </div>
    </div>

    <!-- Title bar -->
    <div class="text-center font-bold pb-1 pt-1 mb-2">
      <div class="text-[14px] font-extrabold tracking-wide">ተጨማሪ የገንዘብ ደረሰኝ</div>
      <div class="text-[15px] uppercase tracking-widest mt-0.5 font-extrabold underline underline-offset-4">Attachment Cash Invoice</div>
    </div>

    <!-- Customer info block - Single Table Format -->
    <table class="w-full border-[2px] border-black mb-2" style="border-collapse: collapse">
      <tr>
        <td class="border-b border-r border-black p-2 w-[65%] align-bottom min-h-[40px]">
          <div class="flex items-end">
            <span class="font-bold text-[12px] whitespace-nowrap">ለ / To:</span>
            <span class="font-bold ml-2 border-b border-black flex-1 inline-block pb-0">{{ order.customer?.name || '\u00A0' }}</span>
          </div>
        </td>
        <td class="border-b border-black p-2 w-[35%] align-bottom">
          <div class="flex items-end">
            <span class="font-bold text-[12px] whitespace-nowrap">ቀን / Date:</span>
            <span class="font-bold font-mono ml-2 border-b border-black flex-1 inline-block text-center pb-0">{{ formattedDate || '\u00A0' }}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td class="border-b border-r border-black p-2 align-bottom">
          <div class="flex items-end">
            <span class="font-bold text-[12px] whitespace-nowrap">የገዥ የታክስ ከፋይ መ.ቁ. / Customer's TIN No.:</span>
            <span class="font-bold font-mono ml-2 border-b border-black flex-1 inline-block pb-0">{{ order.customer?.tin || '\u00A0' }}</span>
          </div>
        </td>
        <td class="border-b border-black p-2 align-bottom">
          <div class="flex items-end">
            <span class="font-bold text-[12px] whitespace-nowrap">የፊስካል ደ.ቁ / FS No.:</span>
            <span class="font-bold font-mono text-[14px] ml-2 border-b border-black flex-1 inline-block text-center pb-0">{{ order.fsNo || '\u00A0' }}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td class="border-r border-black p-2 align-bottom">
          <div class="flex items-end">
            <span class="font-bold text-[12px] whitespace-nowrap">የገዥ የተ.እ.ታ. ቁጥር / Customer's VAT Reg. No.:</span>
            <span class="font-bold font-mono ml-2 border-b border-black flex-1 inline-block pb-0">{{ order.customer?.vatRegNo || '\u00A0' }}</span>
          </div>
        </td>
        <td class="p-2 align-bottom">
          <div class="flex items-end">
            <span class="font-bold text-[12px] whitespace-nowrap">የተመዘገበበት ቀን / Date of Registration:</span>
            <span class="font-bold ml-2 border-b border-black flex-1 inline-block text-center pb-0">&nbsp;</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Line items Table -->
    <table class="w-full border-[2px] border-black mb-2 text-[11px]" style="border-collapse: collapse">
      <thead>
        <tr>
          <th class="border border-black px-1 py-1 text-center font-bold text-[10px] w-10 leading-tight">ተ.ቁ<br/>No.</th>
          <th class="border border-black px-1 py-1 text-left font-bold text-[10px] leading-tight">የዕቃው ዓይነት<br/>Description</th>
          <th class="border border-black px-1 py-1 text-center font-bold text-[10px] w-14 leading-tight">መለኪያ<br/>Unit</th>
          <th class="border border-black px-1 py-1 text-center font-bold text-[10px] w-14 leading-tight">ብዛት<br/>Qty</th>
          <th class="border border-black px-1 py-1 text-right font-bold text-[10px] w-20 leading-tight">የአንዱ ዋጋ<br/>Unit Price</th>
          <th class="border border-black px-1 py-1 text-right font-bold text-[10px] w-24 leading-tight">ጠቅላላ ዋጋ<br/>Total Price</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, i) in order.lines" :key="i" class="h-6">
          <td class="border border-black px-1 py-0.5 text-center font-mono">{{ i + 1 }}</td>
          <td class="border border-black px-1 py-0.5 uppercase">{{ line.itemName }}</td>
          <td class="border border-black px-1 py-0.5 text-center font-bold">{{ line.itemUnit }}</td>
          <td class="border border-black px-1 py-0.5 text-center font-mono font-bold">{{ line.qty }}</td>
          <td class="border border-black px-1 py-0.5 text-right font-mono">{{ Number(line.unitPrice).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
          <td class="border border-black px-1 py-0.5 text-right font-mono">{{ Number(line.total).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
        </tr>
        <tr v-for="n in Math.max(0, 10 - order.lines.length)" :key="`empty-${n}`" class="h-6">
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
          <td colspan="4" class="border-r border-black"></td>
          <td class="border border-black px-2 py-1 text-right font-bold">ድምር / Subtotal</td>
          <td class="border border-black px-2 py-1 text-right font-mono font-bold">{{ Number(order.subtotal).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
        </tr>
        <tr>
          <td colspan="4" class="border-r border-black"></td>
          <td class="border border-black px-2 py-1 text-right font-bold">ተ.እ.ታ / VAT ({{ vatRate }})</td>
          <td class="border border-black px-2 py-1 text-right font-mono font-bold">{{ Number(order.vatAmount).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
        </tr>
        <tr>
          <td colspan="4" class="border-r border-black"></td>
          <td class="border border-black px-2 py-1 text-right font-bold text-[13px]">ጠቅላላ ዋጋ / Grand Total</td>
          <td class="border border-black px-2 py-1 text-right font-mono font-bold text-[13px]">{{ Number(order.grandTotal).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Amount in words -->
    <div class="mb-2 text-[11px] flex items-end px-1">
      <span class="font-bold whitespace-nowrap">የገንዘቡ መጠን በፊደል / Amount in Words:</span>
      <span class="ml-2 font-mono uppercase font-bold text-[12px] leading-tight border-b-[2px] border-black flex-1 pb-0">
        {{ amountInWords(Number(order.grandTotal)) }}
      </span>
    </div>

    <!-- Signatures and Payment Box -->
    <table class="w-full mb-2" style="border-collapse: collapse">
      <tr>
        <td class="pb-2 pt-1" colspan="2">
          <div class="flex items-center gap-12">
            <span class="font-bold text-[12px]">የክፍያ ሁኔታ / Mode of Payment:</span>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 border border-black rounded-sm"></div>
              <span class="font-bold text-[12px]">በካሽ / Cash</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 border border-black rounded-sm"></div>
              <span class="font-bold text-[12px]">በቼክ / Check</span>
            </div>
            <div class="flex-1 flex items-end">
              <span class="font-bold text-[12px] whitespace-nowrap">የቼክ ቁጥር / Cheque No.:</span>
              <span class="ml-2 border-b border-black flex-1 inline-block pb-0">&nbsp;</span>
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td class="w-[45%] align-top h-[45px] relative">
          <div class="flex flex-col h-full">
            <div class="font-bold text-[11px] mb-4">ያፀደቀው / Approved by:</div>
            <div class="border-b border-black w-[80%]"></div>
          </div>
        </td>
        <td class="w-[55%] align-top h-[45px] relative text-right">
          <div class="flex flex-col h-full items-end">
            <div class="font-bold text-[11px] mb-4">የገንዘቡ ተቀባይ ስም እና ፊርማ / Cashier's Name & Signature:</div>
            <div class="border-b border-black w-[80%]"></div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Footer Disclaimers -->
    <div class="text-center pt-2 mt-auto">
      <div class="font-bold text-[12px]">ካሽ ፊስካል ወይም ተመላሽ ደረሰኝ ካልተያያዘ ዋጋ የለውም</div>
      <div class="font-bold text-[12px] uppercase">Invalid Without Fiscal or Refund Receipt Attached</div>
      <div class="mt-4 flex justify-center items-center">
        <span class="font-bold tracking-wider text-[12px]">MACHINE REGISTRATION CODE:</span> 
        <span class="font-mono border-b border-black px-2 pb-0 font-bold ml-2 min-w-[200px] inline-block text-center">{{ mrcCode || '\u00A0' }}</span>
      </div>
    </div>
  </div>
</template>
