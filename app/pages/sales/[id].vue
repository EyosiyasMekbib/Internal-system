<script setup lang="ts">
import SalesInvoice from '~/components/print/SalesInvoice.vue'

definePageMeta({ layout: 'default' })

const route = useRoute()
const { data: order, refresh } = await useFetch(`/api/sales/${route.params.id}`)
const { data: customers } = await useFetch('/api/customers')
const { data: items } = await useFetch('/api/items')
const { data: appSettings } = await useFetch('/api/settings')

const vatRate = computed(() => Number((appSettings.value as any)?.vat_rate ?? 0.15))

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })
}

const showEdit = ref(false)
const saving = ref(false)

type Line = { itemId: string; itemName: string; itemUnit: string; countryOfOrigin: string; brandName: string; qty: number; unitPrice: number }

const form = reactive({
  customerId: '',
  customerName: '',
  customerTin: '',
  customerVatRegNo: '',
  date: '',
  fsNo: '',
  lines: [] as Line[],
})

function openEdit() {
  const o = order.value as any
  Object.assign(form, {
    customerId: o.customerId,
    customerName: o.customer?.name ?? '',
    customerTin: o.customer?.tin ?? '',
    customerVatRegNo: o.customer?.vatRegNo ?? '',
    date: o.date,
    fsNo: o.fsNo,
    lines: (o.lines ?? []).map((l: any) => ({
      itemId: l.itemId,
      itemName: l.itemName ?? '',
      itemUnit: l.itemUnit ?? '',
      countryOfOrigin: l.countryOfOrigin ?? '',
      brandName: l.brandName ?? '',
      qty: Number(l.qty),
      unitPrice: Number(l.unitPrice),
    })),
  })
  showEdit.value = true
}

function onCustomerInput() {
  const selected = (customers.value as any[])?.find(c => c.name === form.customerName)
  if (selected) {
    form.customerId = selected.id
    form.customerTin = selected.tin || ''
    form.customerVatRegNo = selected.vatRegNo || ''
  } else {
    form.customerId = ''
  }
}

function onItemInput(line: Line) {
  const selected = (items.value as any[])?.find(i => i.name === line.itemName)
  if (selected) {
    line.itemId = selected.id
    line.itemUnit = selected.unit
  } else {
    line.itemId = ''
  }
}

function addLine() {
  form.lines.push({ itemId: '', itemName: '', itemUnit: '', countryOfOrigin: '', brandName: '', qty: 1, unitPrice: 0 })
}

function removeLine(i: number) {
  form.lines.splice(i, 1)
}

function lineVat(line: Line) {
  return Math.round(line.qty * line.unitPrice * vatRate.value * 100) / 100
}

const subtotal = computed(() => form.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))
const totalVat = computed(() => form.lines.reduce((s, l) => s + lineVat(l), 0))
const grandTotal = computed(() => subtotal.value + totalVat.value)

async function save() {
  saving.value = true
  try {
    let cId = form.customerId
    if (!cId && form.customerName.trim()) {
      const cust = await $fetch('/api/customers', {
        method: 'POST',
        body: { name: form.customerName, tin: form.customerTin, vatRegNo: form.customerVatRegNo }
      })
      cId = (cust as any).id
    }

    for (const line of form.lines) {
      if (!line.itemId && line.itemName.trim()) {
        const item = await $fetch('/api/items', {
          method: 'POST',
          body: { name: line.itemName, unit: line.itemUnit }
        })
        line.itemId = (item as any).id
      }
    }

    await $fetch(`/api/sales/${route.params.id}`, {
      method: 'PUT',
      body: { ...form, customerId: cId }
    })
    showEdit.value = false
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="px-8 pt-8 pb-6 border-b border-border flex items-center justify-between print:hidden">
      <div class="flex items-center gap-4">
        <NuxtLink to="/sales" class="text-muted hover:text-text text-sm">← Sales</NuxtLink>
        <h1 class="font-display text-2xl font-bold">FS No: {{ (order as any)?.fsNo }}</h1>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="border border-border px-4 py-2 text-sm font-medium hover:bg-surface transition-colors"
          @click="openEdit"
        >
          Edit
        </button>
        <button
          class="bg-text text-bg px-4 py-2 text-sm font-medium hover:bg-red transition-colors"
          onclick="window.print()"
        >
          Print Invoice
        </button>
      </div>
    </div>

    <div class="px-8 py-6 print:hidden">
      <div class="grid grid-cols-3 gap-6 mb-6 text-sm">
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

    <div class="hidden print:block">
      <SalesInvoice v-if="order" :order="(order as any)" />
    </div>

    <!-- Edit slide-in -->
    <div v-if="showEdit" class="fixed inset-0 bg-text/20 flex items-start justify-end z-50" @click.self="showEdit = false">
      <div class="w-[640px] h-full bg-bg border-l border-border flex flex-col overflow-hidden">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <h2 class="font-display text-lg font-bold">Edit Sales Order</h2>
          <button class="text-muted hover:text-red" @click="showEdit = false">✕</button>
        </div>

        <form class="flex-1 overflow-y-auto flex flex-col" @submit.prevent="save">
          <div class="px-6 py-5 space-y-4 border-b border-border">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Customer Name</label>
                <input list="edit-customer-options" v-model="form.customerName" @input="onCustomerInput" required placeholder="Type to search or create new…" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" autocomplete="off" />
                <datalist id="edit-customer-options">
                  <option v-for="c in (customers as any[])" :key="c.id" :value="c.name"></option>
                </datalist>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">TIN <span class="text-muted/50">(Optional)</span></label>
                <input v-model="form.customerTin" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">VAT Reg No <span class="text-muted/50">(Optional)</span></label>
                <input v-model="form.customerVatRegNo" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Date <span class="text-muted/50">(YYYY-MM-DD)</span></label>
                <input v-model="form.date" type="date" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">FS No</label>
                <input v-model="form.fsNo" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
            </div>
          </div>

          <div class="px-6 py-4 flex-1">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium text-muted uppercase tracking-wide">Line Items</span>
              <button type="button" class="text-xs text-muted hover:text-text border border-border px-2 py-1" @click="addLine">+ Add Line</button>
            </div>

            <div v-for="(line, i) in form.lines" :key="i" class="border border-border mb-2 p-3 space-y-2">
              <div class="flex gap-2">
                <input list="edit-item-options" v-model="line.itemName" @input="onItemInput(line)" placeholder="Item name" required class="flex-1 bg-surface border border-border px-2 py-1.5 text-sm outline-none focus:border-text" autocomplete="off" />
                <datalist id="edit-item-options">
                  <option v-for="item in (items as any[])" :key="item.id" :value="item.name"></option>
                </datalist>
                <input v-model="line.itemUnit" placeholder="Unit (e.g. pcs, kg)" required class="w-32 bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                <button type="button" class="text-muted hover:text-red px-2" @click="removeLine(i)">✕</button>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <input v-model="line.countryOfOrigin" placeholder="Origin" class="bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                <input v-model="line.brandName" placeholder="Brand" class="bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                <input v-model.number="line.qty" type="number" step="0.001" min="0.001" placeholder="Qty" class="bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                <input v-model.number="line.unitPrice" type="number" step="0.01" min="0" placeholder="Unit Price" class="bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
              </div>
              <div class="flex justify-between text-xs text-muted font-mono mt-1">
                <span>VAT ({{ (vatRate * 100).toFixed(0) }}%): {{ lineVat(line).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
                <span>Line total: {{ (line.qty * line.unitPrice + lineVat(line)).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-border space-y-1 flex-shrink-0">
            <div class="flex justify-between text-sm">
              <span class="text-muted">Subtotal</span>
              <span class="font-mono">{{ subtotal.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">VAT</span>
              <span class="font-mono">{{ totalVat.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between text-base font-medium border-t border-border pt-2 mt-2">
              <span>Grand Total</span>
              <span class="font-mono">{{ grandTotal.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <button type="submit" :disabled="saving" class="w-full mt-4 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50">
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>