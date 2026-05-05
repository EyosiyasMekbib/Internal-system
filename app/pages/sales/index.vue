<script setup lang="ts">
import SalesInvoice from '~/components/print/SalesInvoice.vue'

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

type Line = { itemId: string; itemName: string; itemUnit: string; countryOfOrigin: string; brandName: string; qty: number; unitPrice: number; costPrice: number }

// ── New Sale ───────────────────────────────────────────────────────────────────
const showForm = ref(false)

const _todayEc = toEthiopian(new Date())
const ecDate = reactive({ year: _todayEc.year, month: _todayEc.month, day: _todayEc.day })

const form = reactive({
  customerId: '',
  customerName: '',
  customerTin: '',
  customerVatRegNo: '',
  date: ecToGregorianIso(_todayEc.year, _todayEc.month, _todayEc.day),
  fsNo: '',
  lines: [] as Line[],
})

watch(ecDate, (v) => {
  try { form.date = ecToGregorianIso(v.year, v.month, v.day) } catch {}
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
  form.lines.push({ itemId: '', itemName: '', itemUnit: '', countryOfOrigin: '', brandName: '', qty: 1, unitPrice: 0, costPrice: 0 })
}

function removeLine(i: number) {
  form.lines.splice(i, 1)
}

function lineVat(line: Line) {
  return Math.round(line.qty * line.unitPrice * vatRate.value * 100) / 100
}

function openNew() {
  const t = toEthiopian(new Date())
  Object.assign(ecDate, { year: t.year, month: t.month, day: t.day })
  Object.assign(form, {
    customerId: '', customerName: '', customerTin: '', customerVatRegNo: '',
    date: ecToGregorianIso(t.year, t.month, t.day),
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
  if (form.lines.length === 0) { alert('Add at least one line item.'); return }
  if (form.lines.some(l => !l.itemName.trim())) { alert('All line items must have a name.'); return }
  if (form.lines.some(l => !l.itemUnit.trim())) { alert('All line items must have a unit.'); return }
  if (form.lines.some(l => l.qty <= 0)) { alert('Quantity must be greater than 0.'); return }
  if (form.lines.some(l => l.unitPrice < 0)) { alert('Unit price cannot be negative.'); return }
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
          body: { name: line.itemName, unit: line.itemUnit, costPrice: line.costPrice }
        })
        line.itemId = (item as any).id
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

// ── Detail / Edit ──────────────────────────────────────────────────────────────
const showDetail = ref(false)
const detailOrder = ref<any>(null)
const detailLoading = ref(false)
const showDetailEdit = ref(false)
const detailSaving = ref(false)

const detailForm = reactive({
  customerId: '',
  customerName: '',
  customerTin: '',
  customerVatRegNo: '',
  date: '',
  fsNo: '',
  lines: [] as Line[],
})

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })
}

async function openDetail(row: any) {
  showDetail.value = true
  showDetailEdit.value = false
  detailLoading.value = true
  detailOrder.value = null
  try {
    detailOrder.value = await $fetch(`/api/sales/${row.id}`)
  } finally {
    detailLoading.value = false
  }
}

function startEdit() {
  const o = detailOrder.value
  Object.assign(detailForm, {
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
      costPrice: 0,
    })),
  })
  showDetailEdit.value = true
}

function onDetailCustomerInput() {
  const selected = (customers.value as any[])?.find(c => c.name === detailForm.customerName)
  if (selected) {
    detailForm.customerId = selected.id
    detailForm.customerTin = selected.tin || ''
    detailForm.customerVatRegNo = selected.vatRegNo || ''
  } else {
    detailForm.customerId = ''
  }
}

function onDetailItemInput(line: Line) {
  const selected = (items.value as any[])?.find(i => i.name === line.itemName)
  if (selected) {
    line.itemId = selected.id
    line.itemUnit = selected.unit
  } else {
    line.itemId = ''
  }
}

function addDetailLine() {
  detailForm.lines.push({ itemId: '', itemName: '', itemUnit: '', countryOfOrigin: '', brandName: '', qty: 1, unitPrice: 0, costPrice: 0 })
}

function removeDetailLine(i: number) {
  detailForm.lines.splice(i, 1)
}

function detailLineVat(line: Line) {
  return Math.round(line.qty * line.unitPrice * vatRate.value * 100) / 100
}

const detailSubtotal = computed(() => detailForm.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))
const detailTotalVat = computed(() => detailForm.lines.reduce((s, l) => s + detailLineVat(l), 0))
const detailGrandTotal = computed(() => detailSubtotal.value + detailTotalVat.value)

async function saveDetail() {
  if (detailForm.lines.length === 0) { alert('Add at least one line item.'); return }
  if (detailForm.lines.some(l => !l.itemName.trim())) { alert('All line items must have a name.'); return }
  if (detailForm.lines.some(l => !l.itemUnit.trim())) { alert('All line items must have a unit.'); return }
  if (detailForm.lines.some(l => l.qty <= 0)) { alert('Quantity must be greater than 0.'); return }
  if (detailForm.lines.some(l => l.unitPrice < 0)) { alert('Unit price cannot be negative.'); return }
  detailSaving.value = true
  try {
    let cId = detailForm.customerId
    if (!cId && detailForm.customerName.trim()) {
      const cust = await $fetch('/api/customers', {
        method: 'POST',
        body: { name: detailForm.customerName, tin: detailForm.customerTin, vatRegNo: detailForm.customerVatRegNo }
      })
      cId = (cust as any).id
    }

    for (const line of detailForm.lines) {
      if (!line.itemId && line.itemName.trim()) {
        const item = await $fetch('/api/items', {
          method: 'POST',
          body: { name: line.itemName, unit: line.itemUnit, costPrice: line.costPrice }
        })
        line.itemId = (item as any).id
      }
    }

    await $fetch(`/api/sales/${detailOrder.value.id}`, {
      method: 'PUT',
      body: { ...detailForm, customerId: cId }
    })
    detailOrder.value = await $fetch(`/api/sales/${detailOrder.value.id}`)
    showDetailEdit.value = false
    await refresh()
  } finally {
    detailSaving.value = false
  }
}
</script>

<template>
  <div>
    <div class="print:hidden">
    <KPageHeader title="Sales" subtitle="Sales orders to customers" action="New Sale" @action="openNew" />
    <div class="px-8 py-6">
      <KTable
        :columns="columns"
        :rows="(sales as any[]) ?? []"
        @row-click="openDetail"
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
                <p class="mt-1 text-xs text-muted">Customer's Tax Identification Number</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">VAT Reg No <span class="text-muted/50">(Optional)</span></label>
                <input v-model="form.customerVatRegNo" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                <p class="mt-1 text-xs text-muted">Customer's VAT registration number</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Date <span class="text-muted/60 normal-case font-normal">(Ethiopian Calendar)</span></label>
                <div class="flex gap-1">
                  <input v-model.number="ecDate.day" type="number" min="1" max="30" placeholder="Day" class="w-16 bg-surface border border-border px-2 py-2 text-sm outline-none focus:border-text" />
                  <select v-model.number="ecDate.month" class="flex-1 bg-surface border border-border px-2 py-2 text-sm outline-none focus:border-text">
                    <option v-for="m in EC_MONTHS" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </select>
                  <input v-model.number="ecDate.year" type="number" min="2000" max="2100" placeholder="Year" class="w-20 bg-surface border border-border px-2 py-2 text-sm outline-none focus:border-text" />
                </div>
                <p class="mt-1 text-xs text-muted">Gregorian: {{ form.date }}</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">FS No</label>
                <input v-model="form.fsNo" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                <p class="mt-1 text-xs text-muted">Fiscal sales receipt number from the register</p>
              </div>
            </div>
          </div>

          <div class="px-6 py-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium text-muted uppercase tracking-wide">Line Items</span>
              <button type="button" class="text-xs text-muted hover:text-text border border-border px-2 py-1" @click="addLine">+ Add Line</button>
            </div>

            <div v-for="(line, i) in form.lines" :key="i" class="border border-border mb-2 p-3 space-y-2">
              <div class="flex gap-2">
                <div class="flex-1">
                  <p class="text-xs text-muted mb-1">Item Name</p>
                  <input list="item-options" v-model="line.itemName" @input="onItemInput(line)" placeholder="Search or type new item…" required class="w-full bg-surface border border-border px-2 py-1.5 text-sm outline-none focus:border-text" autocomplete="off" />
                </div>
                <datalist id="item-options">
                  <option v-for="item in (items as any[])" :key="item.id" :value="item.name"></option>
                </datalist>
                <div class="w-32">
                  <p class="text-xs text-muted mb-1">Unit</p>
                  <input v-model="line.itemUnit" placeholder="pcs / kg / box" required class="w-full bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                </div>
                <div class="flex items-end pb-0.5">
                  <button type="button" class="text-muted hover:text-red px-2 py-1.5" @click="removeLine(i)">✕</button>
                </div>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <div>
                  <p class="text-xs text-muted mb-1">Country of Origin</p>
                  <input v-model="line.countryOfOrigin" placeholder="e.g. Ethiopia" class="w-full bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Brand</p>
                  <input v-model="line.brandName" placeholder="e.g. Acme" class="w-full bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Quantity</p>
                  <input v-model.number="line.qty" type="number" step="0.001" min="0.001" placeholder="0" class="w-full bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">Unit Price ex-VAT (ETB)</p>
                  <input v-model.number="line.unitPrice" type="number" step="0.01" min="0" placeholder="0.00" class="w-full bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                </div>
              </div>
              <div v-if="!line.itemId && line.itemName.trim()" class="grid grid-cols-4 gap-2">
                <div>
                  <p class="text-xs text-muted mb-1">Cost Price (ETB) <span class="text-muted/60">new item</span></p>
                  <input v-model.number="line.costPrice" type="number" step="0.01" min="0" placeholder="0.00" class="w-full bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                </div>
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
              {{ saving ? 'Saving…' : 'Save Sales Order' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Detail / Edit slide-in -->
    <div v-if="showDetail" class="fixed inset-0 bg-text/20 flex items-start justify-end z-50" @click.self="showDetail = false">
      <div class="w-[680px] h-full bg-bg border-l border-border flex flex-col overflow-hidden">

        <!-- Loading -->
        <div v-if="detailLoading" class="flex-1 flex items-center justify-center text-muted text-sm">
          Loading…
        </div>

        <!-- View mode -->
        <template v-else-if="!showDetailEdit && detailOrder">
          <div class="px-6 py-5 border-b border-border flex items-start justify-between flex-shrink-0">
            <div>
              <h2 class="font-display text-lg font-bold">FS No: {{ detailOrder.fsNo }}</h2>
              <p class="text-xs text-muted mt-0.5">{{ detailOrder.date }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button class="border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface transition-colors" @click="startEdit">Edit</button>
              <button class="bg-text text-bg px-3 py-1.5 text-xs font-medium hover:bg-red transition-colors" onclick="window.print()">Print</button>
              <button class="text-muted hover:text-red ml-1 text-lg leading-none" @click="showDetail = false">✕</button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-xs text-muted uppercase tracking-wide mb-1">Customer</p>
                <p class="font-medium">{{ detailOrder.customer?.name }}</p>
                <p class="text-xs text-muted mt-0.5">TIN: {{ detailOrder.customer?.tin || '—' }}</p>
                <p class="text-xs text-muted">VAT: {{ detailOrder.customer?.vatRegNo || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted uppercase tracking-wide mb-1">Date</p>
                <p class="font-medium">{{ detailOrder.date }}</p>
              </div>
              <div>
                <p class="text-xs text-muted uppercase tracking-wide mb-1">FS Number</p>
                <p class="font-mono font-medium">{{ detailOrder.fsNo }}</p>
              </div>
            </div>

            <div>
              <p class="text-xs text-muted uppercase tracking-wide mb-2">Line Items</p>
              <KTable
                :columns="[
                  { key: 'itemName',  label: 'Item' },
                  { key: 'itemUnit',  label: 'Unit',  width: '70px' },
                  { key: 'qty',       label: 'Qty',   numeric: true, width: '70px' },
                  { key: 'unitPrice', label: 'Price', numeric: true, width: '100px' },
                  { key: 'vatAmount', label: 'VAT',   numeric: true, width: '90px' },
                  { key: 'total',     label: 'Total', numeric: true, width: '110px' },
                ]"
                :rows="detailOrder.lines ?? []"
              />
            </div>

            <div class="flex justify-end">
              <div class="w-64 space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted">Subtotal (ex. VAT)</span>
                  <span class="font-mono">{{ fmt(detailOrder.subtotal) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">VAT ({{ (vatRate * 100).toFixed(0) }}%)</span>
                  <span class="font-mono">{{ fmt(detailOrder.vatAmount) }}</span>
                </div>
                <div class="flex justify-between font-medium text-base border-t border-border pt-2">
                  <span>Grand Total</span>
                  <span class="font-mono">{{ fmt(detailOrder.grandTotal) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else-if="showDetailEdit">
          <div class="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-3">
              <button type="button" class="text-muted hover:text-text text-sm" @click="showDetailEdit = false">← Back</button>
              <h2 class="font-display text-lg font-bold">Edit Sales Order</h2>
            </div>
            <button type="button" class="text-muted hover:text-red text-lg leading-none" @click="showDetail = false">✕</button>
          </div>

          <form class="flex-1 overflow-y-auto flex flex-col" @submit.prevent="saveDetail">
            <div class="px-6 py-5 space-y-4 border-b border-border">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Customer Name</label>
                  <input list="detail-customer-options" v-model="detailForm.customerName" @input="onDetailCustomerInput" required placeholder="Type to search or create new…" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" autocomplete="off" />
                  <datalist id="detail-customer-options">
                    <option v-for="c in (customers as any[])" :key="c.id" :value="c.name"></option>
                  </datalist>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">TIN <span class="text-muted/50">(Optional)</span></label>
                  <input v-model="detailForm.customerTin" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">VAT Reg No <span class="text-muted/50">(Optional)</span></label>
                  <input v-model="detailForm.customerVatRegNo" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Date</label>
                  <input v-model="detailForm.date" type="date" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">FS No</label>
                  <input v-model="detailForm.fsNo" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                </div>
              </div>
            </div>

            <div class="px-6 py-4 flex-1">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-muted uppercase tracking-wide">Line Items</span>
                <button type="button" class="text-xs text-muted hover:text-text border border-border px-2 py-1" @click="addDetailLine">+ Add Line</button>
              </div>

              <div v-for="(line, i) in detailForm.lines" :key="i" class="border border-border mb-2 p-3 space-y-2">
                <div class="flex gap-2">
                  <div class="flex-1">
                    <p class="text-xs text-muted mb-1">Item Name</p>
                    <input list="detail-item-options" v-model="line.itemName" @input="onDetailItemInput(line)" placeholder="Search or type new item…" required class="w-full bg-surface border border-border px-2 py-1.5 text-sm outline-none focus:border-text" autocomplete="off" />
                  </div>
                  <datalist id="detail-item-options">
                    <option v-for="item in (items as any[])" :key="item.id" :value="item.name"></option>
                  </datalist>
                  <div class="w-32">
                    <p class="text-xs text-muted mb-1">Unit</p>
                    <input v-model="line.itemUnit" placeholder="pcs / kg / box" required class="w-full bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                  </div>
                  <div class="flex items-end pb-0.5">
                    <button type="button" class="text-muted hover:text-red px-2 py-1.5" @click="removeDetailLine(i)">✕</button>
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-2">
                  <div>
                    <p class="text-xs text-muted mb-1">Country of Origin</p>
                    <input v-model="line.countryOfOrigin" placeholder="e.g. Ethiopia" class="w-full bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                  </div>
                  <div>
                    <p class="text-xs text-muted mb-1">Brand</p>
                    <input v-model="line.brandName" placeholder="e.g. Acme" class="w-full bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                  </div>
                  <div>
                    <p class="text-xs text-muted mb-1">Quantity</p>
                    <input v-model.number="line.qty" type="number" step="0.001" min="0.001" placeholder="0" class="w-full bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                  </div>
                  <div>
                    <p class="text-xs text-muted mb-1">Unit Price ex-VAT (ETB)</p>
                    <input v-model.number="line.unitPrice" type="number" step="0.01" min="0" placeholder="0.00" class="w-full bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                  </div>
                </div>
                <div v-if="!line.itemId && line.itemName.trim()" class="grid grid-cols-4 gap-2">
                  <div>
                    <p class="text-xs text-muted mb-1">Cost Price (ETB) <span class="text-muted/60">new item</span></p>
                    <input v-model.number="line.costPrice" type="number" step="0.01" min="0" placeholder="0.00" class="w-full bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                  </div>
                </div>
                <div class="flex justify-between text-xs text-muted font-mono mt-1">
                  <span>VAT ({{ (vatRate * 100).toFixed(0) }}%): {{ detailLineVat(line).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
                  <span>Line total: {{ (line.qty * line.unitPrice + detailLineVat(line)).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

            <div class="px-6 py-4 border-t border-border space-y-1 flex-shrink-0">
              <div class="flex justify-between text-sm">
                <span class="text-muted">Subtotal</span>
                <span class="font-mono">{{ detailSubtotal.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">VAT</span>
                <span class="font-mono">{{ detailTotalVat.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <div class="flex justify-between text-base font-medium border-t border-border pt-2 mt-2">
                <span>Grand Total</span>
                <span class="font-mono">{{ detailGrandTotal.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <button type="submit" :disabled="detailSaving" class="w-full mt-4 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50">
                {{ detailSaving ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </template>

      </div>
    </div>

    </div><!-- end print:hidden -->

    <!-- Print template (hidden on screen, visible when printing) -->
    <div class="hidden print:block">
      <SalesInvoice v-if="detailOrder" :order="detailOrder" />
    </div>
  </div>
</template>
