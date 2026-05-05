<script setup lang="ts">
import PurchaseVoucher from '~/components/print/PurchaseVoucher.vue'

definePageMeta({ layout: 'default' })

const { data: purchases, refresh } = await useFetch('/api/purchases')
const { data: suppliers } = await useFetch('/api/suppliers')
const { data: items } = await useFetch('/api/items')

const columns = [
  { key: 'date',         label: 'Date',        width: '110px' },
  { key: 'supplierName', label: 'Supplier' },
  { key: 'voucherNo',    label: 'Voucher No',  width: '140px' },
  { key: 'grandTotal',   label: 'Total (ETB)', numeric: true, width: '140px' },
]

type Line = { itemId: string; itemName: string; itemUnit: string; countryOfOrigin: string; brandName: string; qty: number; unitPrice: number }

// ── New Purchase ───────────────────────────────────────────────────────────────
const showForm = ref(false)

const _todayEc = toEthiopian(new Date())
const ecDate = reactive({ year: _todayEc.year, month: _todayEc.month, day: _todayEc.day })

const form = reactive({
  supplierId: '',
  supplierName: '',
  supplierTin: '',
  supplierVatRegNo: '',
  date: ecToGregorianIso(_todayEc.year, _todayEc.month, _todayEc.day),
  voucherNo: '',
  vatAmount: '',
  notes: '',
  lines: [] as Line[],
})

watch(ecDate, (v) => {
  try { form.date = ecToGregorianIso(v.year, v.month, v.day) } catch {}
})

function onSupplierInput() {
  const selected = (suppliers.value as any[])?.find(s => s.name === form.supplierName)
  if (selected) {
    form.supplierId = selected.id
    form.supplierTin = selected.tin || ''
    form.supplierVatRegNo = selected.vatRegNo || ''
  } else {
    form.supplierId = ''
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

function openNew() {
  const t = toEthiopian(new Date())
  Object.assign(ecDate, { year: t.year, month: t.month, day: t.day })
  Object.assign(form, {
    supplierId: '', supplierName: '', supplierTin: '', supplierVatRegNo: '',
    date: ecToGregorianIso(t.year, t.month, t.day),
    voucherNo: '', vatAmount: '', notes: '', lines: [],
  })
  addLine()
  showForm.value = true
}

const saving = ref(false)

const subtotal = computed(() => form.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))
const grandTotal = computed(() => subtotal.value + Number(form.vatAmount || 0))

async function save() {
  saving.value = true
  try {
    let sId = form.supplierId
    if (!sId && form.supplierName.trim()) {
      const s = await $fetch('/api/suppliers', {
        method: 'POST',
        body: { name: form.supplierName, tin: form.supplierTin, vatRegNo: form.supplierVatRegNo }
      })
      sId = (s as any).id
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

    await $fetch('/api/purchases', {
      method: 'POST',
      body: { ...form, supplierId: sId }
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
  supplierId: '',
  supplierName: '',
  supplierTin: '',
  supplierVatRegNo: '',
  date: '',
  voucherNo: '',
  vatAmount: '',
  notes: '',
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
    detailOrder.value = await $fetch(`/api/purchases/${row.id}`)
  } finally {
    detailLoading.value = false
  }
}

function startEdit() {
  const o = detailOrder.value
  Object.assign(detailForm, {
    supplierId: o.supplierId,
    supplierName: o.supplier?.name ?? '',
    supplierTin: o.supplier?.tin ?? '',
    supplierVatRegNo: o.supplier?.vatRegNo ?? '',
    date: o.date,
    voucherNo: o.voucherNo ?? '',
    vatAmount: o.vatAmount ?? '',
    notes: o.notes ?? '',
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
  showDetailEdit.value = true
}

function onDetailSupplierInput() {
  const selected = (suppliers.value as any[])?.find(s => s.name === detailForm.supplierName)
  if (selected) {
    detailForm.supplierId = selected.id
    detailForm.supplierTin = selected.tin || ''
    detailForm.supplierVatRegNo = selected.vatRegNo || ''
  } else {
    detailForm.supplierId = ''
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
  detailForm.lines.push({ itemId: '', itemName: '', itemUnit: '', countryOfOrigin: '', brandName: '', qty: 1, unitPrice: 0 })
}

function removeDetailLine(i: number) {
  detailForm.lines.splice(i, 1)
}

const detailSubtotal = computed(() => detailForm.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))
const detailGrandTotal = computed(() => detailSubtotal.value + Number(detailForm.vatAmount || 0))

async function saveDetail() {
  detailSaving.value = true
  try {
    let sId = detailForm.supplierId
    if (!sId && detailForm.supplierName.trim()) {
      const s = await $fetch('/api/suppliers', {
        method: 'POST',
        body: { name: detailForm.supplierName, tin: detailForm.supplierTin, vatRegNo: detailForm.supplierVatRegNo }
      })
      sId = (s as any).id
    }

    for (const line of detailForm.lines) {
      if (!line.itemId && line.itemName.trim()) {
        const item = await $fetch('/api/items', {
          method: 'POST',
          body: { name: line.itemName, unit: line.itemUnit }
        })
        line.itemId = (item as any).id
      }
    }

    await $fetch(`/api/purchases/${detailOrder.value.id}`, {
      method: 'PUT',
      body: { ...detailForm, supplierId: sId }
    })
    detailOrder.value = await $fetch(`/api/purchases/${detailOrder.value.id}`)
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
    <KPageHeader title="Purchases" subtitle="Purchase orders from suppliers" action="New Purchase" @action="openNew" />
    <div class="px-8 py-6">
      <KTable
        :columns="columns"
        :rows="(purchases as any[]) ?? []"
        @row-click="openDetail"
      >
        <template #cell-grandTotal="{ value }">
          {{ Number(value).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}
        </template>
      </KTable>
    </div>

    <!-- New Purchase slide-in -->
    <div v-if="showForm" class="fixed inset-0 bg-text/20 flex items-start justify-end z-50" @click.self="showForm = false">
      <div class="w-[640px] h-full bg-bg border-l border-border flex flex-col overflow-hidden">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <h2 class="font-display text-lg font-bold">New Purchase Order</h2>
          <button class="text-muted hover:text-red" @click="showForm = false">✕</button>
        </div>

        <form class="flex-1 overflow-y-auto" @submit.prevent="save">
          <div class="px-6 py-5 space-y-4 border-b border-border">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Supplier Name</label>
                <input list="supplier-options" v-model="form.supplierName" @input="onSupplierInput" required placeholder="Type to search or create new…" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" autocomplete="off" />
                <datalist id="supplier-options">
                  <option v-for="s in (suppliers as any[])" :key="s.id" :value="s.name"></option>
                </datalist>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">TIN <span class="text-muted/50">(Optional)</span></label>
                <input v-model="form.supplierTin" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                <p class="mt-1 text-xs text-muted">Tax Identification Number (from ERCA)</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">VAT Reg No <span class="text-muted/50">(Optional)</span></label>
                <input v-model="form.supplierVatRegNo" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                <p class="mt-1 text-xs text-muted">Supplier's VAT registration number</p>
              </div>
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
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Voucher No</label>
                <input v-model="form.voucherNo" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                <p class="mt-1 text-xs text-muted">Supplier invoice or voucher reference</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">VAT Amount (ETB)</label>
                <input v-model="form.vatAmount" type="number" step="0.01" min="0" class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
                <p class="mt-1 text-xs text-muted">Total VAT as shown on supplier invoice</p>
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
                  <p class="text-xs text-muted mb-1">Unit Price (ETB)</p>
                  <input v-model.number="line.unitPrice" type="number" step="0.01" min="0" placeholder="0.00" class="w-full bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                </div>
              </div>
              <div class="text-right text-xs text-muted font-mono">
                Line total: {{ (line.qty * line.unitPrice).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}
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
              <span class="font-mono">{{ Number(form.vatAmount || 0).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between text-base font-medium border-t border-border pt-2 mt-2">
              <span>Grand Total</span>
              <span class="font-mono">{{ grandTotal.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <button type="submit" :disabled="saving" class="w-full mt-4 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50">
              {{ saving ? 'Saving…' : 'Save Purchase Order' }}
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
              <h2 class="font-display text-lg font-bold">{{ detailOrder.voucherNo || 'Purchase Order' }}</h2>
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
                <p class="text-xs text-muted uppercase tracking-wide mb-1">Supplier</p>
                <p class="font-medium">{{ detailOrder.supplier?.name }}</p>
                <p class="text-xs text-muted mt-0.5">TIN: {{ detailOrder.supplier?.tin || '—' }}</p>
                <p class="text-xs text-muted">VAT: {{ detailOrder.supplier?.vatRegNo || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted uppercase tracking-wide mb-1">Date</p>
                <p class="font-medium">{{ detailOrder.date }}</p>
              </div>
              <div>
                <p class="text-xs text-muted uppercase tracking-wide mb-1">Voucher No</p>
                <p class="font-mono">{{ detailOrder.voucherNo || '—' }}</p>
              </div>
            </div>

            <div>
              <p class="text-xs text-muted uppercase tracking-wide mb-2">Line Items</p>
              <KTable
                :columns="[
                  { key: 'itemName',        label: 'Item' },
                  { key: 'countryOfOrigin', label: 'Origin', width: '90px' },
                  { key: 'brandName',       label: 'Brand',  width: '100px' },
                  { key: 'qty',             label: 'Qty',    numeric: true, width: '70px' },
                  { key: 'unitPrice',       label: 'Price',  numeric: true, width: '100px' },
                  { key: 'total',           label: 'Total',  numeric: true, width: '110px' },
                ]"
                :rows="detailOrder.lines ?? []"
              />
            </div>

            <div class="flex justify-end">
              <div class="w-64 space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted">Subtotal</span>
                  <span class="font-mono">{{ fmt(detailOrder.subtotal) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">VAT (15%)</span>
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
              <h2 class="font-display text-lg font-bold">Edit Purchase Order</h2>
            </div>
            <button type="button" class="text-muted hover:text-red text-lg leading-none" @click="showDetail = false">✕</button>
          </div>

          <form class="flex-1 overflow-y-auto flex flex-col" @submit.prevent="saveDetail">
            <div class="px-6 py-5 space-y-4 border-b border-border">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Supplier Name</label>
                  <input list="detail-supplier-options" v-model="detailForm.supplierName" @input="onDetailSupplierInput" required placeholder="Type to search or create new…" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" autocomplete="off" />
                  <datalist id="detail-supplier-options">
                    <option v-for="s in (suppliers as any[])" :key="s.id" :value="s.name"></option>
                  </datalist>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">TIN <span class="text-muted/50">(Optional)</span></label>
                  <input v-model="detailForm.supplierTin" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">VAT Reg No <span class="text-muted/50">(Optional)</span></label>
                  <input v-model="detailForm.supplierVatRegNo" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Date</label>
                  <input v-model="detailForm.date" type="date" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Voucher No</label>
                  <input v-model="detailForm.voucherNo" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">VAT Amount (ETB)</label>
                  <input v-model="detailForm.vatAmount" type="number" step="0.01" min="0" class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
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
                    <p class="text-xs text-muted mb-1">Unit Price (ETB)</p>
                    <input v-model.number="line.unitPrice" type="number" step="0.01" min="0" placeholder="0.00" class="w-full bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                  </div>
                </div>
                <div class="text-right text-xs text-muted font-mono">
                  Line total: {{ (line.qty * line.unitPrice).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}
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
                <span class="font-mono">{{ Number(detailForm.vatAmount || 0).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
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
      <PurchaseVoucher v-if="detailOrder" :order="detailOrder" />
    </div>
  </div>
</template>
