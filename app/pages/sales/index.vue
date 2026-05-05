<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: sales, refresh } = await useFetch('/api/sales')
const { data: customers } = await useFetch('/api/customers')
const { data: items } = await useFetch('/api/items')
const { data: appSettings } = await useFetch('/api/settings')

const vatRate = computed(() => Number((appSettings.value as any)?.vat_rate ?? 0.15))

const columns = [
  { key: 'date',         label: 'Date',        width: '110px' },
  { key: 'customerName', label: 'Customer' },
  { key: 'grandTotal',   label: 'Total (ETB)', numeric: true, width: '140px' },
]

const showForm = ref(false)

type Line = { itemId: string; itemName: string; itemUnit: string; countryOfOrigin: string; brandName: string; qty: number; unitPrice: number }

const form = reactive({
  customerId: '',
  customerName: '',
  customerTin: '',
  customerVatRegNo: '',
  date: new Date().toISOString().split('T')[0],
  fsNo: '',
  lines: [] as Line[],
})

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

function openNew() {
  Object.assign(form, {
    customerId: '', customerName: '', customerTin: '', customerVatRegNo: '', 
    date: new Date().toISOString().split('T')[0],
    fsNo: '', lines: [],
  })
  addLine()
  showForm.value = true
}

const saving = ref(false)

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
      cId = cust.id
    }

    for (const line of form.lines) {
      if (!line.itemId && line.itemName.trim()) {
        const item = await $fetch('/api/items', {
          method: 'POST',
          body: { name: line.itemName, unit: line.itemUnit }
        })
        line.itemId = item.id
      }
    }

    await $fetch('/api/sales', { 
      method: 'POST', 
      body: { ...form, customerId: cId } 
    })
    showForm.value = false
    refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <KPageHeader title="Sales" subtitle="Sales orders to customers" action="New Sale" @action="openNew" />
    <div class="px-8 py-6">
      <KTable
        :columns="columns"
        :rows="(sales as any[]) ?? []"
        @row-click="(row: any) => navigateTo(`/sales/${row.id}`)"
      >
        <template #cell-grandTotal="{ value }">
          {{ Number(value).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}
        </template>
      </KTable>
    </div>

    <!-- New Sale slide-in -->
    <div v-if="showForm" class="fixed inset-0 bg-text/20 flex items-start justify-end z-50" @click.self="showForm = false">
      <div class="w-[640px] h-full bg-bg border-l border-border flex flex-col overflow-hidden">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <h2 class="font-display text-lg font-bold">New Sales Order</h2>
          <button class="text-muted hover:text-red" @click="showForm = false">✕</button>
        </div>

        <form class="flex-1 overflow-y-auto" @submit.prevent="save">
          <div class="px-6 py-5 space-y-4 border-b border-border">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Customer Name</label>
                <input list="customer-options" v-model="form.customerName" @input="onCustomerInput" required placeholder="Type to search or create new…" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" autocomplete="off" />
                <datalist id="customer-options">
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
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Date</label>
                <input v-model="form.date" type="date" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">FS No</label>
                <input v-model="form.fsNo" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
            </div>
          </div>

          <!-- Lines -->
          <div class="px-6 py-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium text-muted uppercase tracking-wide">Line Items</span>
              <button type="button" class="text-xs text-muted hover:text-text border border-border px-2 py-1" @click="addLine">+ Add Line</button>
            </div>

            <div v-for="(line, i) in form.lines" :key="i" class="border border-border mb-2 p-3 space-y-2">
              <div class="flex gap-2">
                <input list="item-options" v-model="line.itemName" @input="onItemInput(line)" placeholder="Item name" required class="flex-1 bg-surface border border-border px-2 py-1.5 text-sm outline-none focus:border-text" autocomplete="off" />
                <datalist id="item-options">
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

          <!-- Totals + submit -->
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
            <button type="submit" class="w-full mt-4 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors">
              Save Sales Order
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
