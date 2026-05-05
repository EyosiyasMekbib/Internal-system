<script setup lang="ts">
import PurchaseVoucher from '~/components/print/PurchaseVoucher.vue'

definePageMeta({ layout: 'default' })

const route = useRoute()
const { data: order } = await useFetch(`/api/purchases/${route.params.id}`)
</script>

<template>
  <div>
    <div class="px-8 pt-8 pb-6 border-b border-border flex items-center justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink to="/purchases" class="text-muted hover:text-text text-sm">← Purchases</NuxtLink>
        <h1 class="font-display text-2xl font-bold">{{ (order as any)?.voucherNo || 'Purchase Order' }}</h1>
      </div>
      <button class="bg-text text-bg px-4 py-2 text-sm font-medium hover:bg-red transition-colors" onclick="window.print()">
        Print
      </button>
    </div>

    <div class="px-8 py-6 print:hidden">
      <div class="grid grid-cols-3 gap-6 mb-6 text-sm">
        <div>
          <p class="text-xs text-muted uppercase tracking-wide mb-1">Supplier</p>
          <p class="font-medium">{{ (order as any)?.supplier?.name }}</p>
          <p class="text-muted">TIN: {{ (order as any)?.supplier?.tin || '—' }}</p>
        </div>
        <div>
          <p class="text-xs text-muted uppercase tracking-wide mb-1">Date</p>
          <p class="font-medium">{{ (order as any)?.date }}</p>
        </div>
        <div>
          <p class="text-xs text-muted uppercase tracking-wide mb-1">Voucher No</p>
          <p class="font-mono">{{ (order as any)?.voucherNo || '—' }}</p>
        </div>
      </div>

      <KTable
        :columns="[
          { key: 'itemName', label: 'Item' },
          { key: 'countryOfOrigin', label: 'Origin', width: '100px' },
          { key: 'brandName', label: 'Brand', width: '120px' },
          { key: 'qty', label: 'Qty', numeric: true, width: '80px' },
          { key: 'unitPrice', label: 'Unit Price', numeric: true, width: '120px' },
          { key: 'total', label: 'Total', numeric: true, width: '130px' },
        ]"
        :rows="(order as any)?.lines ?? []"
      />

      <div class="mt-4 flex justify-end">
        <div class="w-64 space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-muted">Subtotal</span>
            <span class="font-mono">{{ Number((order as any)?.subtotal).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">VAT (15%)</span>
            <span class="font-mono">{{ Number((order as any)?.vatAmount).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="flex justify-between font-medium text-base border-t border-border pt-2">
            <span>Grand Total</span>
            <span class="font-mono">{{ Number((order as any)?.grandTotal).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
          </div>
        </div>
      </div>
    </div>
    <PurchaseVoucher v-if="order" :order="(order as any)" />
  </div>
</template>