<script setup lang="ts">
import SalesInvoice from '~/components/print/SalesInvoice.vue'

definePageMeta({ layout: 'default' })

const route = useRoute()
const { data: order } = await useFetch(`/api/sales/${route.params.id}`)

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })
}
</script>

<template>
  <div>
    <!-- Screen header (hidden on print) -->
    <div class="px-8 pt-8 pb-6 border-b border-border flex items-center justify-between print:hidden">
      <div class="flex items-center gap-4">
        <NuxtLink to="/sales" class="text-muted hover:text-text text-sm">← Sales</NuxtLink>
        <h1 class="font-display text-2xl font-bold">FS No: {{ (order as any)?.fsNo }}</h1>
      </div>
      <button
        class="bg-text text-bg px-4 py-2 text-sm font-medium hover:bg-red transition-colors"
        onclick="window.print()"
      >
        Print Invoice
      </button>
    </div>

    <!-- Screen summary (hidden on print) -->
    <div class="px-8 py-6 print:hidden">
      <div class="grid grid-cols-4 gap-6 mb-6 text-sm">
        <div>
          <p class="text-xs text-muted uppercase tracking-wide mb-1">Customer</p>
          <p class="font-medium">{{ (order as any)?.customer?.name }}</p>
          <p class="text-muted text-xs">TIN: {{ (order as any)?.customer?.tin || '—' }}</p>
          <p class="text-muted text-xs">VAT: {{ (order as any)?.customer?.vatRegNo || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-muted uppercase tracking-wide mb-1">Date</p>
          <p class="font-medium">{{ (order as any)?.date }}</p>
        </div>
        <div>
          <p class="text-xs text-muted uppercase tracking-wide mb-1">FS Number</p>
          <p class="font-mono font-medium">{{ (order as any)?.fsNo }}</p>
        </div>
        <div>
          <p class="text-xs text-muted uppercase tracking-wide mb-1">MRC Code</p>
          <p class="font-mono">{{ (order as any)?.mrcCode || '—' }}</p>
        </div>
      </div>

      <KTable
        :columns="[
          { key: 'itemName',  label: 'Item' },
          { key: 'itemUnit',  label: 'Unit',       width: '80px' },
          { key: 'qty',       label: 'Qty',        numeric: true, width: '80px' },
          { key: 'unitPrice', label: 'Unit Price', numeric: true, width: '120px' },
          { key: 'vatAmount', label: 'VAT',        numeric: true, width: '110px' },
          { key: 'total',     label: 'Total',      numeric: true, width: '130px' },
        ]"
        :rows="(order as any)?.lines ?? []"
      />

      <div class="mt-4 flex justify-end">
        <div class="w-64 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Subtotal (ex. VAT)</span>
            <span class="font-mono">{{ fmt((order as any)?.subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">VAT 15%</span>
            <span class="font-mono">{{ fmt((order as any)?.vatAmount) }}</span>
          </div>
          <div class="flex justify-between font-medium text-base border-t border-border pt-2">
            <span>Grand Total</span>
            <span class="font-mono">{{ fmt((order as any)?.grandTotal) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Print template -->
    <SalesInvoice v-if="order" :order="(order as any)" />
  </div>
</template>