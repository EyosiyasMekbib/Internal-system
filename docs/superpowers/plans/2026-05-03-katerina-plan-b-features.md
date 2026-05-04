# Katerina Internal System — Plan B: Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all business features on top of the Plan A foundation — Items/Suppliers/Customers CRUD, Purchase Orders, Sales Orders with VAT, inventory management, pixel-perfect print templates, VAT register with ERCA Excel export, and the Dashboard.

**Architecture:** Nitro server routes handle all API logic. Each entity has focused API files. Inventory updates (stock qty + weighted avg cost) execute inside DB transactions. Print templates use `@media print` CSS — no PDF library needed. Excel export uses ExcelJS server-side.

**Tech Stack:** Nuxt 3, Drizzle ORM, PostgreSQL, ExcelJS, ethiopian-date, Tailwind CSS, Libre Baskerville + DM Sans + JetBrains Mono, shadcn-vue

**Prerequisites:** Plan A complete and verified.

---

## File Map

```
server/
  api/
    items/
      index.get.ts          ← GET  /api/items
      index.post.ts         ← POST /api/items
      [id].get.ts           ← GET  /api/items/:id
      [id].put.ts           ← PUT  /api/items/:id
      [id].delete.ts        ← DELETE /api/items/:id
    suppliers/
      index.get.ts
      index.post.ts
      [id].put.ts
      [id].delete.ts
    customers/
      index.get.ts
      index.post.ts
      [id].put.ts
      [id].delete.ts
    purchases/
      index.get.ts          ← GET  /api/purchases (list)
      index.post.ts         ← POST /api/purchases (create + update inventory)
      [id].get.ts           ← GET  /api/purchases/:id (with lines)
    sales/
      index.get.ts
      index.post.ts         ← POST /api/sales (create + deduct inventory + calc VAT)
      [id].get.ts
    reports/
      vat-register.get.ts   ← GET  /api/reports/vat-register?ec_year=&ec_month=
      vat-register-export.get.ts ← GET /api/reports/vat-register-export (→ .xlsx download)
    dashboard/
      index.get.ts          ← GET  /api/dashboard
  utils/
    vat.ts                  ← VAT calculation helpers

pages/
  items/index.vue
  suppliers/index.vue
  customers/index.vue
  purchases/
    index.vue
    [id].vue
  sales/
    index.vue
    [id].vue
  reports/index.vue
  index.vue                 ← Dashboard (replaces stub)

components/
  KTable.vue                ← Shared data table
  KPageHeader.vue           ← Page title + action button
  KBadge.vue                ← Status / label chip
  forms/
    ItemForm.vue
    SupplierForm.vue
    CustomerForm.vue
    PurchaseOrderForm.vue
    SalesOrderForm.vue
  print/
    SalesInvoice.vue        ← Katerina VAT invoice (print-only)
    PurchaseVoucher.vue     ← Voucher print layout

tests/
  vat.test.ts
  purchases-api.test.ts     ← unit tests for transaction logic helpers
  sales-api.test.ts
```

---

## Task 1: VAT Calculation Utility

**Files:**
- Create: `server/utils/vat.ts`, `tests/vat.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/vat.test.ts
import { describe, it, expect } from 'vitest'
import { calcLineVat, calcOrderTotals } from '../server/utils/vat'

describe('calcLineVat', () => {
  it('calculates 15% VAT on a line', () => {
    const result = calcLineVat(4, 29739.132)
    expect(result.subtotal).toBeCloseTo(118956.528)
    expect(result.vatAmount).toBeCloseTo(17843.479)
    expect(result.total).toBeCloseTo(136799.007)
  })

  it('rounds to 2 decimal places', () => {
    const result = calcLineVat(1, 100)
    expect(result.vatAmount).toBeCloseTo(15)
    expect(result.total).toBeCloseTo(115)
  })
})

describe('calcOrderTotals', () => {
  it('sums lines into order totals', () => {
    const lines = [
      { subtotal: 100, vatAmount: 15, total: 115 },
      { subtotal: 200, vatAmount: 30, total: 230 },
    ]
    const result = calcOrderTotals(lines)
    expect(result.subtotal).toBeCloseTo(300)
    expect(result.vatAmount).toBeCloseTo(45)
    expect(result.grandTotal).toBeCloseTo(345)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run tests/vat.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// server/utils/vat.ts
const VAT_RATE = 0.15

export function calcLineVat(qty: number, unitPrice: number) {
  const subtotal = qty * unitPrice
  const vatAmount = subtotal * VAT_RATE
  const total = subtotal + vatAmount
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}

export function calcOrderTotals(lines: { subtotal: number; vatAmount: number; total: number }[]) {
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0)
  const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0)
  const grandTotal = lines.reduce((s, l) => s + l.total, 0)
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run tests/vat.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/utils/vat.ts tests/vat.test.ts
git commit -m "feat: add vat calculation utilities"
```

---

## Task 2: Shared UI Components

**Files:**
- Create: `components/KTable.vue`, `components/KPageHeader.vue`, `components/KBadge.vue`

- [ ] **Step 1: Create KPageHeader**

```vue
<!-- components/KPageHeader.vue -->
<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  action?: string
}>()
defineEmits(['action'])
</script>

<template>
  <div class="flex items-start justify-between px-8 pt-8 pb-6 border-b border-border">
    <div>
      <h1 class="font-display text-2xl font-bold text-text">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-muted">{{ subtitle }}</p>
    </div>
    <button
      v-if="action"
      class="flex items-center gap-2 bg-text text-bg px-4 py-2 text-sm font-medium hover:bg-red transition-colors"
      @click="$emit('action')"
    >
      <span>+</span>
      {{ action }}
    </button>
  </div>
</template>
```

- [ ] **Step 2: Create KBadge**

```vue
<!-- components/KBadge.vue -->
<script setup lang="ts">
defineProps<{ label: string; variant?: 'default' | 'red' | 'muted' }>()
</script>

<template>
  <span
    class="inline-block px-2 py-0.5 text-xs font-medium tracking-wide uppercase"
    :class="{
      'bg-surface2 text-text': !variant || variant === 'default',
      'bg-red-light text-red': variant === 'red',
      'bg-surface text-muted border border-border': variant === 'muted',
    }"
  >
    {{ label }}
  </span>
</template>
```

- [ ] **Step 3: Create KTable**

```vue
<!-- components/KTable.vue -->
<script setup lang="ts">
defineProps<{
  columns: { key: string; label: string; numeric?: boolean; width?: string }[]
  rows: Record<string, unknown>[]
  loading?: boolean
  emptyMessage?: string
}>()
defineEmits(['row-click'])
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b border-border bg-surface">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide font-ui"
            :class="{ 'text-right': col.numeric }"
            :style="col.width ? `width: ${col.width}` : ''"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="px-4 py-8 text-center text-muted text-sm">
            Loading…
          </td>
        </tr>
        <tr v-else-if="!rows.length">
          <td :colspan="columns.length" class="px-4 py-8 text-center text-muted text-sm">
            {{ emptyMessage ?? 'No records found.' }}
          </td>
        </tr>
        <tr
          v-for="(row, i) in rows"
          v-else
          :key="i"
          class="border-b border-border hover:bg-surface cursor-pointer transition-colors"
          @click="$emit('row-click', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-text"
            :class="col.numeric ? 'font-mono text-right' : 'font-ui'"
          >
            <slot :name="`cell-${col.key}`" :value="row[col.key]" :row="row">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add components/KTable.vue components/KPageHeader.vue components/KBadge.vue
git commit -m "feat: add shared table, page header, and badge components"
```

---

## Task 3: Items API + Page

**Files:**
- Create: `server/api/items/index.get.ts`, `server/api/items/index.post.ts`, `server/api/items/[id].put.ts`, `server/api/items/[id].delete.ts`, `pages/items/index.vue`

- [ ] **Step 1: GET /api/items**

```typescript
// server/api/items/index.get.ts
import { db } from '~/server/db/index'
import { items } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db.select().from(items).orderBy(asc(items.name))
})
```

- [ ] **Step 2: POST /api/items**

```typescript
// server/api/items/index.post.ts
import { db } from '~/server/db/index'
import { items } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name || !body.unit) {
    throw createError({ statusCode: 422, message: 'name and unit are required' })
  }
  const [item] = await db.insert(items).values({
    name: body.name,
    unit: body.unit,
    costPrice: String(body.costPrice ?? 0),
    salePrice: String(body.salePrice ?? 0),
  }).returning()
  return item
})
```

- [ ] **Step 3: PUT /api/items/[id]**

```typescript
// server/api/items/[id].put.ts
import { db } from '~/server/db/index'
import { items } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const [item] = await db.update(items)
    .set({
      name: body.name,
      unit: body.unit,
      costPrice: String(body.costPrice),
      salePrice: String(body.salePrice),
      updatedAt: new Date(),
    })
    .where(eq(items.id, id))
    .returning()
  if (!item) throw createError({ statusCode: 404, message: 'Item not found' })
  return item
})
```

- [ ] **Step 4: DELETE /api/items/[id]**

```typescript
// server/api/items/[id].delete.ts
import { db } from '~/server/db/index'
import { items } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(items).where(eq(items.id, id))
  return { ok: true }
})
```

- [ ] **Step 5: Create Items page**

```vue
<!-- pages/items/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: items, refresh } = await useFetch('/api/items')

const columns = [
  { key: 'name',      label: 'Item Name' },
  { key: 'unit',      label: 'Unit',        width: '80px' },
  { key: 'costPrice', label: 'Cost Price',  numeric: true, width: '130px' },
  { key: 'salePrice', label: 'Sale Price',  numeric: true, width: '130px' },
  { key: 'margin',    label: 'Margin',      numeric: true, width: '100px' },
  { key: 'stockQty',  label: 'Stock',       numeric: true, width: '80px' },
]

const rows = computed(() => (items.value ?? []).map((item: any) => ({
  ...item,
  margin: item.salePrice && item.costPrice
    ? (((+item.salePrice - +item.costPrice) / +item.salePrice) * 100).toFixed(1) + '%'
    : '—',
})))

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', unit: '', costPrice: '', salePrice: '' })

function openNew() {
  editing.value = null
  Object.assign(form, { name: '', unit: '', costPrice: '', salePrice: '' })
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  Object.assign(form, {
    name: row.name,
    unit: row.unit,
    costPrice: row.costPrice,
    salePrice: row.salePrice,
  })
  showForm.value = true
}

async function save() {
  if (editing.value) {
    await $fetch(`/api/items/${editing.value.id}`, { method: 'PUT', body: form })
  } else {
    await $fetch('/api/items', { method: 'POST', body: form })
  }
  showForm.value = false
  refresh()
}

async function remove(row: any) {
  if (!confirm(`Delete "${row.name}"?`)) return
  await $fetch(`/api/items/${row.id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div>
    <KPageHeader title="Items" subtitle="Product catalog" action="New Item" @action="openNew" />

    <div class="px-8 py-6">
      <KTable :columns="columns" :rows="rows" @row-click="openEdit">
        <template #cell-stockQty="{ value, row }">
          <span :class="{ 'text-red font-medium': +value < 5 }">{{ value }}</span>
        </template>
      </KTable>
    </div>

    <!-- Inline form panel -->
    <div
      v-if="showForm"
      class="fixed inset-0 bg-text/20 flex items-start justify-end"
      @click.self="showForm = false"
    >
      <div class="w-96 h-full bg-bg border-l border-border flex flex-col">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">{{ editing ? 'Edit Item' : 'New Item' }}</h2>
          <button class="text-muted hover:text-red" @click="showForm = false">✕</button>
        </div>
        <form class="flex-1 px-6 py-5 space-y-4 overflow-y-auto" @submit.prevent="save">
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Name</label>
            <input v-model="form.name" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Unit</label>
            <input v-model="form.unit" required placeholder="Pcs / Roll / Box" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Cost Price (ETB)</label>
            <input v-model="form.costPrice" type="number" step="0.01" min="0" class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Sale Price before VAT (ETB)</label>
            <input v-model="form.salePrice" type="number" step="0.01" min="0" class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
          </div>
          <div class="pt-4 flex gap-2">
            <button type="submit" class="flex-1 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors">Save</button>
            <button v-if="editing" type="button" class="px-4 py-2.5 text-sm text-red border border-red hover:bg-red-light transition-colors" @click="remove(editing); showForm = false">Delete</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/items`. Confirm:
- Table renders with correct columns
- "New Item" opens slide-in form panel
- Save creates item, table refreshes
- Click row to edit
- Stock qty < 5 renders in red

- [ ] **Step 7: Commit**

```bash
git add server/api/items/ pages/items/
git commit -m "feat: items crud — api routes and list page"
```

---

## Task 4: Suppliers API + Page

**Files:**
- Create: `server/api/suppliers/index.get.ts`, `server/api/suppliers/index.post.ts`, `server/api/suppliers/[id].put.ts`, `server/api/suppliers/[id].delete.ts`, `pages/suppliers/index.vue`

- [ ] **Step 1: GET /api/suppliers**

```typescript
// server/api/suppliers/index.get.ts
import { db } from '~/server/db/index'
import { suppliers } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db.select().from(suppliers).orderBy(asc(suppliers.name))
})
```

- [ ] **Step 2: POST /api/suppliers**

```typescript
// server/api/suppliers/index.post.ts
import { db } from '~/server/db/index'
import { suppliers } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 422, message: 'name is required' })
  const [supplier] = await db.insert(suppliers).values({
    name: body.name,
    tin: body.tin ?? null,
    vatRegNo: body.vatRegNo ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
  }).returning()
  return supplier
})
```

- [ ] **Step 3: PUT /api/suppliers/[id]**

```typescript
// server/api/suppliers/[id].put.ts
import { db } from '~/server/db/index'
import { suppliers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const [supplier] = await db.update(suppliers)
    .set({ name: body.name, tin: body.tin, vatRegNo: body.vatRegNo, phone: body.phone, address: body.address })
    .where(eq(suppliers.id, id))
    .returning()
  if (!supplier) throw createError({ statusCode: 404, message: 'Supplier not found' })
  return supplier
})
```

- [ ] **Step 4: DELETE /api/suppliers/[id]**

```typescript
// server/api/suppliers/[id].delete.ts
import { db } from '~/server/db/index'
import { suppliers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(suppliers).where(eq(suppliers.id, id))
  return { ok: true }
})
```

- [ ] **Step 5: Create Suppliers page**

```vue
<!-- pages/suppliers/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: suppliers, refresh } = await useFetch('/api/suppliers')

const columns = [
  { key: 'name',     label: 'Supplier Name' },
  { key: 'tin',      label: 'TIN',         width: '130px' },
  { key: 'vatRegNo', label: 'VAT Reg No',  width: '150px' },
  { key: 'phone',    label: 'Phone',        width: '130px' },
  { key: 'address',  label: 'Address' },
]

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', tin: '', vatRegNo: '', phone: '', address: '' })

function openNew() {
  editing.value = null
  Object.assign(form, { name: '', tin: '', vatRegNo: '', phone: '', address: '' })
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  Object.assign(form, { name: row.name, tin: row.tin ?? '', vatRegNo: row.vatRegNo ?? '', phone: row.phone ?? '', address: row.address ?? '' })
  showForm.value = true
}

async function save() {
  if (editing.value) {
    await $fetch(`/api/suppliers/${editing.value.id}`, { method: 'PUT', body: form })
  } else {
    await $fetch('/api/suppliers', { method: 'POST', body: form })
  }
  showForm.value = false
  refresh()
}

async function remove(row: any) {
  if (!confirm(`Delete "${row.name}"?`)) return
  await $fetch(`/api/suppliers/${row.id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div>
    <KPageHeader title="Suppliers" action="New Supplier" @action="openNew" />
    <div class="px-8 py-6">
      <KTable :columns="columns" :rows="suppliers ?? []" @row-click="openEdit">
        <template #cell-tin="{ value }">
          <span class="font-mono text-sm">{{ value ?? '—' }}</span>
        </template>
      </KTable>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-text/20 flex items-start justify-end" @click.self="showForm = false">
      <div class="w-96 h-full bg-bg border-l border-border flex flex-col">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">{{ editing ? 'Edit Supplier' : 'New Supplier' }}</h2>
          <button class="text-muted hover:text-red" @click="showForm = false">✕</button>
        </div>
        <form class="flex-1 px-6 py-5 space-y-4 overflow-y-auto" @submit.prevent="save">
          <div v-for="field in [
            { key: 'name', label: 'Name', required: true },
            { key: 'tin', label: 'TIN' },
            { key: 'vatRegNo', label: 'VAT Reg No' },
            { key: 'phone', label: 'Phone' },
            { key: 'address', label: 'Address' },
          ]" :key="field.key">
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">{{ field.label }}</label>
            <input v-model="(form as any)[field.key]" :required="field.required" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
          </div>
          <div class="pt-4 flex gap-2">
            <button type="submit" class="flex-1 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors">Save</button>
            <button v-if="editing" type="button" class="px-4 py-2.5 text-sm text-red border border-red hover:bg-red-light" @click="remove(editing); showForm = false">Delete</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 6: Commit**

```bash
git add server/api/suppliers/ pages/suppliers/
git commit -m "feat: suppliers crud — api routes and list page"
```

---

## Task 5: Customers API + Page

**Files:**
- Create: `server/api/customers/index.get.ts`, `server/api/customers/index.post.ts`, `server/api/customers/[id].put.ts`, `server/api/customers/[id].delete.ts`, `pages/customers/index.vue`

- [ ] **Step 1: GET /api/customers**

```typescript
// server/api/customers/index.get.ts
import { db } from '~/server/db/index'
import { customers } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db.select().from(customers).orderBy(asc(customers.name))
})
```

- [ ] **Step 2: POST /api/customers**

```typescript
// server/api/customers/index.post.ts
import { db } from '~/server/db/index'
import { customers } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 422, message: 'name is required' })
  const [customer] = await db.insert(customers).values({
    name: body.name,
    tin: body.tin ?? null,
    vatRegNo: body.vatRegNo ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
  }).returning()
  return customer
})
```

- [ ] **Step 3: PUT /api/customers/[id]**

```typescript
// server/api/customers/[id].put.ts
import { db } from '~/server/db/index'
import { customers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const [customer] = await db.update(customers)
    .set({ name: body.name, tin: body.tin, vatRegNo: body.vatRegNo, phone: body.phone, address: body.address })
    .where(eq(customers.id, id))
    .returning()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })
  return customer
})
```

- [ ] **Step 4: DELETE /api/customers/[id]**

```typescript
// server/api/customers/[id].delete.ts
import { db } from '~/server/db/index'
import { customers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await db.delete(customers).where(eq(customers.id, id))
  return { ok: true }
})
```

- [ ] **Step 5: Create Customers page**

Identical pattern to Suppliers page but with customer data. Create `pages/customers/index.vue`:

```vue
<!-- pages/customers/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: customers, refresh } = await useFetch('/api/customers')

const columns = [
  { key: 'name',     label: 'Customer Name' },
  { key: 'tin',      label: 'TIN',         width: '130px' },
  { key: 'vatRegNo', label: 'VAT Reg No',  width: '150px' },
  { key: 'phone',    label: 'Phone',        width: '130px' },
  { key: 'address',  label: 'Address' },
]

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', tin: '', vatRegNo: '', phone: '', address: '' })

function openNew() {
  editing.value = null
  Object.assign(form, { name: '', tin: '', vatRegNo: '', phone: '', address: '' })
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  Object.assign(form, { name: row.name, tin: row.tin ?? '', vatRegNo: row.vatRegNo ?? '', phone: row.phone ?? '', address: row.address ?? '' })
  showForm.value = true
}

async function save() {
  if (editing.value) {
    await $fetch(`/api/customers/${editing.value.id}`, { method: 'PUT', body: form })
  } else {
    await $fetch('/api/customers', { method: 'POST', body: form })
  }
  showForm.value = false
  refresh()
}

async function remove(row: any) {
  if (!confirm(`Delete "${row.name}"?`)) return
  await $fetch(`/api/customers/${row.id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div>
    <KPageHeader title="Customers" action="New Customer" @action="openNew" />
    <div class="px-8 py-6">
      <KTable :columns="columns" :rows="customers ?? []" @row-click="openEdit">
        <template #cell-tin="{ value }">
          <span class="font-mono text-sm">{{ value ?? '—' }}</span>
        </template>
      </KTable>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-text/20 flex items-start justify-end" @click.self="showForm = false">
      <div class="w-96 h-full bg-bg border-l border-border flex flex-col">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">{{ editing ? 'Edit Customer' : 'New Customer' }}</h2>
          <button class="text-muted hover:text-red" @click="showForm = false">✕</button>
        </div>
        <form class="flex-1 px-6 py-5 space-y-4 overflow-y-auto" @submit.prevent="save">
          <div v-for="field in [
            { key: 'name', label: 'Name', required: true },
            { key: 'tin', label: 'TIN' },
            { key: 'vatRegNo', label: 'VAT Reg No' },
            { key: 'phone', label: 'Phone' },
            { key: 'address', label: 'Address' },
          ]" :key="field.key">
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">{{ field.label }}</label>
            <input v-model="(form as any)[field.key]" :required="field.required" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
          </div>
          <div class="pt-4 flex gap-2">
            <button type="submit" class="flex-1 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors">Save</button>
            <button v-if="editing" type="button" class="px-4 py-2.5 text-sm text-red border border-red hover:bg-red-light" @click="remove(editing); showForm = false">Delete</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 6: Commit**

```bash
git add server/api/customers/ pages/customers/
git commit -m "feat: customers crud — api routes and list page"
```

---

## Task 6: Purchase Orders API

**Files:**
- Create: `server/api/purchases/index.get.ts`, `server/api/purchases/index.post.ts`, `server/api/purchases/[id].get.ts`

- [ ] **Step 1: GET /api/purchases (list)**

```typescript
// server/api/purchases/index.get.ts
import { db } from '~/server/db/index'
import { purchaseOrders, suppliers } from '~/server/db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db
    .select({
      id: purchaseOrders.id,
      date: purchaseOrders.date,
      voucherNo: purchaseOrders.voucherNo,
      grandTotal: purchaseOrders.grandTotal,
      supplierName: suppliers.name,
      supplierId: purchaseOrders.supplierId,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .orderBy(desc(purchaseOrders.date))
})
```

- [ ] **Step 2: GET /api/purchases/[id] (detail with lines)**

```typescript
// server/api/purchases/[id].get.ts
import { db } from '~/server/db/index'
import { purchaseOrders, purchaseOrderLines, suppliers, items } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const [order] = await db
    .select()
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.id, id))

  if (!order) throw createError({ statusCode: 404, message: 'Purchase order not found' })

  const lines = await db
    .select({
      id: purchaseOrderLines.id,
      itemId: purchaseOrderLines.itemId,
      itemName: items.name,
      itemUnit: items.unit,
      countryOfOrigin: purchaseOrderLines.countryOfOrigin,
      brandName: purchaseOrderLines.brandName,
      qty: purchaseOrderLines.qty,
      unitPrice: purchaseOrderLines.unitPrice,
      total: purchaseOrderLines.total,
    })
    .from(purchaseOrderLines)
    .leftJoin(items, eq(purchaseOrderLines.itemId, items.id))
    .where(eq(purchaseOrderLines.purchaseOrderId, id))

  return {
    ...order.purchase_orders,
    supplier: order.suppliers,
    lines,
  }
})
```

- [ ] **Step 3: POST /api/purchases (create + inventory transaction)**

```typescript
// server/api/purchases/index.post.ts
import { db } from '~/server/db/index'
import { purchaseOrders, purchaseOrderLines, items } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { weightedAverageCost } from '~/server/utils/inventory'

interface PurchaseLine {
  itemId: string
  countryOfOrigin?: string
  brandName?: string
  qty: number
  unitPrice: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.supplierId || !body.date || !Array.isArray(body.lines) || body.lines.length === 0) {
    throw createError({ statusCode: 422, message: 'supplierId, date, and lines[] are required' })
  }

  const lines: PurchaseLine[] = body.lines

  // Calculate order totals (purchases include VAT at order level, not line level)
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vatAmount = body.vatAmount != null ? Number(body.vatAmount) : 0
  const grandTotal = subtotal + vatAmount

  return await db.transaction(async (tx) => {
    // Insert order
    const [order] = await tx.insert(purchaseOrders).values({
      supplierId: body.supplierId,
      date: body.date,
      voucherNo: body.voucherNo ?? null,
      subtotal: String(subtotal.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      notes: body.notes ?? null,
    }).returning()

    // Insert lines + update inventory
    for (const line of lines) {
      const lineTotal = line.qty * line.unitPrice

      await tx.insert(purchaseOrderLines).values({
        purchaseOrderId: order.id,
        itemId: line.itemId,
        countryOfOrigin: line.countryOfOrigin ?? null,
        brandName: line.brandName ?? null,
        qty: String(line.qty),
        unitPrice: String(line.unitPrice),
        total: String(lineTotal.toFixed(2)),
      })

      // Update item stock + weighted average cost
      const [item] = await tx.select().from(items).where(eq(items.id, line.itemId))
      if (!item) throw createError({ statusCode: 404, message: `Item ${line.itemId} not found` })

      const newCost = weightedAverageCost(
        Number(item.stockQty),
        Number(item.costPrice),
        line.qty,
        line.unitPrice
      )

      await tx.update(items)
        .set({
          stockQty: String((Number(item.stockQty) + line.qty).toFixed(4)),
          costPrice: String(newCost.toFixed(4)),
          updatedAt: new Date(),
        })
        .where(eq(items.id, line.itemId))
    }

    return order
  })
})
```

- [ ] **Step 4: Commit**

```bash
git add server/api/purchases/
git commit -m "feat: purchase orders api with inventory transaction"
```

---

## Task 7: Purchase Orders UI

**Files:**
- Create: `pages/purchases/index.vue`, `pages/purchases/[id].vue`

- [ ] **Step 1: Purchases list page**

```vue
<!-- pages/purchases/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: purchases, refresh } = await useFetch('/api/purchases')
const { data: suppliers } = await useFetch('/api/suppliers')
const { data: items } = await useFetch('/api/items')

const columns = [
  { key: 'date',         label: 'Date',     width: '110px' },
  { key: 'supplierName', label: 'Supplier' },
  { key: 'voucherNo',    label: 'Voucher No', width: '140px' },
  { key: 'grandTotal',   label: 'Total (ETB)', numeric: true, width: '140px' },
]

const showForm = ref(false)

type Line = { itemId: string; countryOfOrigin: string; brandName: string; qty: number; unitPrice: number }

const form = reactive({
  supplierId: '',
  date: new Date().toISOString().split('T')[0],
  voucherNo: '',
  vatAmount: '',
  notes: '',
  lines: [] as Line[],
})

function addLine() {
  form.lines.push({ itemId: '', countryOfOrigin: '', brandName: '', qty: 1, unitPrice: 0 })
}

function removeLine(i: number) {
  form.lines.splice(i, 1)
}

function openNew() {
  Object.assign(form, {
    supplierId: '', date: new Date().toISOString().split('T')[0],
    voucherNo: '', vatAmount: '', notes: '', lines: [],
  })
  addLine()
  showForm.value = true
}

const subtotal = computed(() => form.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))
const grandTotal = computed(() => subtotal.value + Number(form.vatAmount || 0))

async function save() {
  await $fetch('/api/purchases', { method: 'POST', body: { ...form } })
  showForm.value = false
  refresh()
}
</script>

<template>
  <div>
    <KPageHeader title="Purchases" subtitle="Purchase orders from suppliers" action="New Purchase" @action="openNew" />
    <div class="px-8 py-6">
      <KTable
        :columns="columns"
        :rows="(purchases as any[]) ?? []"
        @row-click="(row: any) => navigateTo(`/purchases/${row.id}`)"
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
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Supplier</label>
                <select v-model="form.supplierId" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text">
                  <option value="" disabled>Select…</option>
                  <option v-for="s in (suppliers as any[])" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Date</label>
                <input v-model="form.date" type="date" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Voucher No</label>
                <input v-model="form.voucherNo" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">VAT Amount (ETB)</label>
                <input v-model="form.vatAmount" type="number" step="0.01" min="0" class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
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
                <select v-model="line.itemId" required class="flex-1 bg-surface border border-border px-2 py-1.5 text-sm outline-none focus:border-text">
                  <option value="" disabled>Select item…</option>
                  <option v-for="item in (items as any[])" :key="item.id" :value="item.id">{{ item.name }} ({{ item.unit }})</option>
                </select>
                <button type="button" class="text-muted hover:text-red px-2" @click="removeLine(i)">✕</button>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <input v-model="line.countryOfOrigin" placeholder="Origin" class="bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                <input v-model="line.brandName" placeholder="Brand" class="bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                <input v-model.number="line.qty" type="number" step="0.001" min="0.001" placeholder="Qty" class="bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                <input v-model.number="line.unitPrice" type="number" step="0.01" min="0" placeholder="Unit Price" class="bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
              </div>
              <div class="text-right text-xs text-muted font-mono">
                Line total: {{ (line.qty * line.unitPrice).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}
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
              <span class="font-mono">{{ Number(form.vatAmount || 0).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="flex justify-between text-base font-medium border-t border-border pt-2 mt-2">
              <span>Grand Total</span>
              <span class="font-mono">{{ grandTotal.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <button type="submit" class="w-full mt-4 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors">
              Save Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Purchase detail page**

```vue
<!-- pages/purchases/[id].vue -->
<script setup lang="ts">
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
  </div>
</template>
```

- [ ] **Step 3: Verify in browser**

Navigate to `/purchases`. Create a purchase order with 1+ lines. Confirm:
- Item stock qty increases after save
- Detail page shows correct supplier + line items + totals
- Print button triggers browser print dialog

- [ ] **Step 4: Commit**

```bash
git add pages/purchases/
git commit -m "feat: purchase orders ui — list and detail pages"
```

---

## Task 8: Sales Orders API

**Files:**
- Create: `server/api/sales/index.get.ts`, `server/api/sales/index.post.ts`, `server/api/sales/[id].get.ts`

- [ ] **Step 1: GET /api/sales (list)**

```typescript
// server/api/sales/index.get.ts
import { db } from '~/server/db/index'
import { salesOrders, customers } from '~/server/db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db
    .select({
      id: salesOrders.id,
      date: salesOrders.date,
      fsNo: salesOrders.fsNo,
      mrcCode: salesOrders.mrcCode,
      grandTotal: salesOrders.grandTotal,
      customerName: customers.name,
      customerId: salesOrders.customerId,
      createdAt: salesOrders.createdAt,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .orderBy(desc(salesOrders.date))
})
```

- [ ] **Step 2: GET /api/sales/[id]**

```typescript
// server/api/sales/[id].get.ts
import { db } from '~/server/db/index'
import { salesOrders, salesOrderLines, customers, items } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const [order] = await db
    .select()
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .where(eq(salesOrders.id, id))

  if (!order) throw createError({ statusCode: 404, message: 'Sales order not found' })

  const lines = await db
    .select({
      id: salesOrderLines.id,
      itemId: salesOrderLines.itemId,
      itemName: items.name,
      itemUnit: items.unit,
      countryOfOrigin: salesOrderLines.countryOfOrigin,
      brandName: salesOrderLines.brandName,
      qty: salesOrderLines.qty,
      unitPrice: salesOrderLines.unitPrice,
      vatAmount: salesOrderLines.vatAmount,
      total: salesOrderLines.total,
    })
    .from(salesOrderLines)
    .leftJoin(items, eq(salesOrderLines.itemId, items.id))
    .where(eq(salesOrderLines.salesOrderId, id))

  return {
    ...order.sales_orders,
    customer: order.customers,
    lines,
  }
})
```

- [ ] **Step 3: POST /api/sales (create + deduct inventory + VAT)**

```typescript
// server/api/sales/index.post.ts
import { db } from '~/server/db/index'
import { salesOrders, salesOrderLines, items } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { calcLineVat, calcOrderTotals } from '~/server/utils/vat'

interface SaleLine {
  itemId: string
  countryOfOrigin?: string
  brandName?: string
  qty: number
  unitPrice: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.customerId || !body.date || !body.fsNo || !Array.isArray(body.lines) || body.lines.length === 0) {
    throw createError({ statusCode: 422, message: 'customerId, date, fsNo, and lines[] are required' })
  }

  const lines: SaleLine[] = body.lines

  const computedLines = lines.map((l) => ({
    ...l,
    ...calcLineVat(l.qty, l.unitPrice),
  }))

  const totals = calcOrderTotals(computedLines)

  return await db.transaction(async (tx) => {
    const [order] = await tx.insert(salesOrders).values({
      customerId: body.customerId,
      date: body.date,
      fsNo: body.fsNo,
      mrcCode: body.mrcCode ?? null,
      subtotal: String(totals.subtotal),
      vatAmount: String(totals.vatAmount),
      grandTotal: String(totals.grandTotal),
      notes: body.notes ?? null,
    }).returning()

    for (const line of computedLines) {
      await tx.insert(salesOrderLines).values({
        salesOrderId: order.id,
        itemId: line.itemId,
        countryOfOrigin: line.countryOfOrigin ?? null,
        brandName: line.brandName ?? null,
        qty: String(line.qty),
        unitPrice: String(line.unitPrice),
        vatAmount: String(line.vatAmount),
        total: String(line.total),
      })

      // Deduct inventory
      const [item] = await tx.select().from(items).where(eq(items.id, line.itemId))
      if (!item) throw createError({ statusCode: 404, message: `Item ${line.itemId} not found` })

      const newQty = Number(item.stockQty) - line.qty
      if (newQty < 0) {
        throw createError({ statusCode: 422, message: `Insufficient stock for "${item.name}". Available: ${item.stockQty}` })
      }

      await tx.update(items)
        .set({ stockQty: String(newQty.toFixed(4)), updatedAt: new Date() })
        .where(eq(items.id, line.itemId))
    }

    return order
  })
})
```

- [ ] **Step 4: Commit**

```bash
git add server/api/sales/
git commit -m "feat: sales orders api with vat calculation and inventory deduction"
```

---

## Task 9: Sales Orders UI

**Files:**
- Create: `pages/sales/index.vue`, `pages/sales/[id].vue`

- [ ] **Step 1: Sales list page**

```vue
<!-- pages/sales/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: sales, refresh } = await useFetch('/api/sales')
const { data: customers } = await useFetch('/api/customers')
const { data: items } = await useFetch('/api/items')

const columns = [
  { key: 'date',         label: 'Date',       width: '110px' },
  { key: 'customerName', label: 'Customer' },
  { key: 'fsNo',         label: 'FS No',      width: '140px' },
  { key: 'subtotal',     label: 'Subtotal',   numeric: true, width: '120px' },
  { key: 'vatAmount',    label: 'VAT (15%)',  numeric: true, width: '110px' },
  { key: 'grandTotal',   label: 'Total',      numeric: true, width: '130px' },
]

const showForm = ref(false)

type Line = { itemId: string; countryOfOrigin: string; brandName: string; qty: number; unitPrice: number }

const form = reactive({
  customerId: '',
  date: new Date().toISOString().split('T')[0],
  fsNo: '',
  mrcCode: '',
  notes: '',
  lines: [] as Line[],
})

function addLine() {
  form.lines.push({ itemId: '', countryOfOrigin: '', brandName: '', qty: 1, unitPrice: 0 })
}

function removeLine(i: number) { form.lines.splice(i, 1) }

function openNew() {
  Object.assign(form, {
    customerId: '', date: new Date().toISOString().split('T')[0],
    fsNo: '', mrcCode: '', notes: '', lines: [],
  })
  addLine()
  showForm.value = true
}

const lineCalc = computed(() => form.lines.map((l) => {
  const subtotal = l.qty * l.unitPrice
  const vat = subtotal * 0.15
  return { subtotal, vat, total: subtotal + vat }
}))

const orderTotals = computed(() => ({
  subtotal: lineCalc.value.reduce((s, l) => s + l.subtotal, 0),
  vat: lineCalc.value.reduce((s, l) => s + l.vat, 0),
  grand: lineCalc.value.reduce((s, l) => s + l.total, 0),
}))

async function save() {
  await $fetch('/api/sales', { method: 'POST', body: { ...form } })
  showForm.value = false
  refresh()
}

function fmt(n: number) { return n.toLocaleString('en-ET', { minimumFractionDigits: 2 }) }
</script>

<template>
  <div>
    <KPageHeader title="Sales" subtitle="Sales invoices" action="New Sale" @action="openNew" />
    <div class="px-8 py-6">
      <KTable
        :columns="columns"
        :rows="(sales as any[]) ?? []"
        @row-click="(row: any) => navigateTo(`/sales/${row.id}`)"
      >
        <template #cell-grandTotal="{ value }">
          <span class="font-medium">{{ Number(value).toLocaleString('en-ET', { minimumFractionDigits: 2 }) }}</span>
        </template>
        <template #cell-fsNo="{ value }">
          <span class="font-mono text-sm">{{ value }}</span>
        </template>
      </KTable>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-text/20 flex items-start justify-end z-50" @click.self="showForm = false">
      <div class="w-[680px] h-full bg-bg border-l border-border flex flex-col overflow-hidden">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <h2 class="font-display text-lg font-bold">New Sales Order</h2>
          <button class="text-muted hover:text-red" @click="showForm = false">✕</button>
        </div>

        <form class="flex-1 overflow-y-auto" @submit.prevent="save">
          <div class="px-6 py-5 space-y-4 border-b border-border">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Customer</label>
                <select v-model="form.customerId" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text">
                  <option value="" disabled>Select…</option>
                  <option v-for="c in (customers as any[])" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Date</label>
                <input v-model="form.date" type="date" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">FS No <span class="text-red">*</span></label>
                <input v-model="form.fsNo" required class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">MRC Code</label>
                <input v-model="form.mrcCode" class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
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
                <select v-model="line.itemId" required class="flex-1 bg-surface border border-border px-2 py-1.5 text-sm outline-none focus:border-text">
                  <option value="" disabled>Select item…</option>
                  <option v-for="item in (items as any[])" :key="item.id" :value="item.id">
                    {{ item.name }} ({{ item.unit }}) — Stock: {{ item.stockQty }}
                  </option>
                </select>
                <button type="button" class="text-muted hover:text-red px-2" @click="removeLine(i)">✕</button>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <input v-model="line.countryOfOrigin" placeholder="Origin" class="bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                <input v-model="line.brandName" placeholder="Brand" class="bg-surface border border-border px-2 py-1.5 text-xs outline-none focus:border-text" />
                <input v-model.number="line.qty" type="number" step="0.001" min="0.001" placeholder="Qty" class="bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
                <input v-model.number="line.unitPrice" type="number" step="0.01" min="0" placeholder="Unit Price (pre-VAT)" class="bg-surface border border-border px-2 py-1.5 text-xs font-mono outline-none focus:border-text" />
              </div>
              <div class="text-right text-xs text-muted font-mono space-x-4">
                <span>Subtotal: {{ fmt(lineCalc[i]?.subtotal ?? 0) }}</span>
                <span>VAT: {{ fmt(lineCalc[i]?.vat ?? 0) }}</span>
                <span class="text-text font-medium">Total: {{ fmt(lineCalc[i]?.total ?? 0) }}</span>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-border flex-shrink-0 space-y-1">
            <div class="flex justify-between text-sm">
              <span class="text-muted">Subtotal (ex. VAT)</span>
              <span class="font-mono">{{ fmt(orderTotals.subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">VAT 15%</span>
              <span class="font-mono">{{ fmt(orderTotals.vat) }}</span>
            </div>
            <div class="flex justify-between font-medium text-base border-t border-border pt-2">
              <span>Grand Total</span>
              <span class="font-mono">{{ fmt(orderTotals.grand) }}</span>
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
```

- [ ] **Step 2: Commit list page**

```bash
git add pages/sales/index.vue
git commit -m "feat: sales orders list page with new order form"
```

---

## Task 10: Katerina VAT Invoice Print Template

**Files:**
- Create: `components/print/SalesInvoice.vue`, `pages/sales/[id].vue`

- [ ] **Step 1: Create print-only SalesInvoice component**

This component renders only when printing. It matches the Katerina Faraldi "Attachment Cash Invoice" template exactly.

```vue
<!-- components/print/SalesInvoice.vue -->
<script setup lang="ts">
const props = defineProps<{
  order: {
    date: string
    fsNo: string
    mrcCode?: string
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
      total: string
    }[]
  }
}>()

function amountInWords(amount: number): string {
  // Simple ETB amount-in-words for whole numbers
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
        <img src="/images/katerina-logo.png" alt="Katerina" class="h-14 mb-1" />
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
        <!-- Empty rows to fill space -->
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
          <td colspan="5" class="border border-[#000] px-2 py-1 text-right font-bold">ተ.እ.ታ (15%) / VAT (15%)</td>
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

    <!-- Footer note -->
    <div class="mt-2 text-[8px] text-center border-t border-[#000] pt-1 flex justify-between">
      <span>ካሽ ፊስካል ወይም ተመላሽ ደረሰኝ ካልተሰጠ ዋጋ የለውም</span>
      <span>INVALID WITHOUT FISCAL OR REFUND RECEIPT ATTACHED</span>
    </div>
    <div class="text-[8px] text-right">
      MACHINE REGISTRATION CODE: <span class="font-mono">{{ order.mrcCode || '' }}</span>
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
```

- [ ] **Step 2: Create Sales detail page**

```vue
<!-- pages/sales/[id].vue -->
<script setup lang="ts">
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
```

- [ ] **Step 3: Verify print layout**

```bash
npm run dev
```

1. Create a sales order via `/sales`
2. Click through to detail page
3. Click "Print Invoice"
4. Verify print preview matches Katerina invoice template layout

- [ ] **Step 4: Commit**

```bash
git add components/print/SalesInvoice.vue pages/sales/[id].vue pages/sales/index.vue
git commit -m "feat: sales orders ui with katerina vat invoice print template"
```

---

## Task 11: VAT Register API + Export

**Files:**
- Create: `server/api/reports/vat-register.get.ts`, `server/api/reports/vat-register-export.get.ts`

- [ ] **Step 1: GET /api/reports/vat-register**

```typescript
// server/api/reports/vat-register.get.ts
import { db } from '~/server/db/index'
import { salesOrders, salesOrderLines, customers, items } from '~/server/db/schema'
import { eq, between } from 'drizzle-orm'
import { ecMonthDateRange, toEthiopian, formatEcDate, formatEcMonth } from '~/server/utils/ec-dates'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const ecYear = Number(query.ec_year)
  const ecMonth = Number(query.ec_month)

  if (!ecYear || !ecMonth) {
    throw createError({ statusCode: 422, message: 'ec_year and ec_month are required' })
  }

  const { start, end } = ecMonthDateRange(ecYear, ecMonth)
  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  const rows = await db
    .select({
      saleDate: salesOrders.date,
      fsNo: salesOrders.fsNo,
      mrcCode: salesOrders.mrcCode,
      customerName: customers.name,
      itemName: items.name,
      itemUnit: items.unit,
      countryOfOrigin: salesOrderLines.countryOfOrigin,
      brandName: salesOrderLines.brandName,
      qty: salesOrderLines.qty,
      unitPrice: salesOrderLines.unitPrice,
      vatAmount: salesOrderLines.vatAmount,
      total: salesOrderLines.total,
      costPrice: items.costPrice,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(salesOrderLines, eq(salesOrderLines.salesOrderId, salesOrders.id))
    .leftJoin(items, eq(salesOrderLines.itemId, items.id))
    .where(between(salesOrders.date, startStr, endStr))
    .orderBy(salesOrders.date)

  const totals = rows.reduce((acc, r) => ({
    qty: acc.qty + Number(r.qty || 0),
    subtotal: acc.subtotal + (Number(r.qty || 0) * Number(r.unitPrice || 0)),
    vat: acc.vat + Number(r.vatAmount || 0),
    total: acc.total + Number(r.total || 0),
  }), { qty: 0, subtotal: 0, vat: 0, total: 0 })

  return {
    header: {
      company: 'KATERINAFARALDI',
      tin: '0007036896',
      monthLabel: formatEcMonth(ecYear, ecMonth),
    },
    rows: rows.map((r, i) => ({
      sn: i + 1,
      itemName: r.itemName,
      countryOfOrigin: r.countryOfOrigin,
      brandName: r.brandName,
      unit: r.itemUnit,
      qty: r.qty,
      avgCostPrice: r.costPrice,
      unitSalePrice: r.unitPrice,
      vatAmount: r.vatAmount,
      grandTotal: r.total,
      kValue: String((Number(r.qty || 0) * Number(r.total || 0)).toFixed(2)),
      fsNo: r.fsNo,
      saleDate: formatEcDate(new Date(r.saleDate!)),
      mrcCode: r.mrcCode,
    })),
    totals,
  }
})
```

- [ ] **Step 2: GET /api/reports/vat-register-export (Excel download)**

```typescript
// server/api/reports/vat-register-export.get.ts
import ExcelJS from 'exceljs'
import { db } from '~/server/db/index'
import { salesOrders, salesOrderLines, customers, items } from '~/server/db/schema'
import { eq, between } from 'drizzle-orm'
import { ecMonthDateRange, formatEcDate, formatEcMonth } from '~/server/utils/ec-dates'

const AM_HEADERS = [
  'ተ.ቁ',
  'የተሸጠው የዕቃ መጠሪያ (A)',
  'የስሪት ሀገር (B)',
  'Brand Name (C)',
  'መለኪያ',
  'ብዛት (D)',
  'የአንዱ አማካይ ግዢ ዋጋ (E)',
  'የአንዱ ሽያጭ ዋጋ ከ ተ.እ.ታ በፊት (F)',
  'የተ.እ.ታ (15%) (G)',
  'ጠቅላላ ዋጋ ታክስ ጨምሮ H(F+G)',
  'K=(F×J)',
  'የሽያጭ ደረሰኝ ቁጥር (FS No.) (J)',
  'ሽያጩ የተከናወነበት ቀን (J)',
  'MRC (K)',
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const ecYear = Number(query.ec_year)
  const ecMonth = Number(query.ec_month)

  if (!ecYear || !ecMonth) {
    throw createError({ statusCode: 422, message: 'ec_year and ec_month required' })
  }

  const { start, end } = ecMonthDateRange(ecYear, ecMonth)
  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  const rows = await db
    .select({
      saleDate: salesOrders.date,
      fsNo: salesOrders.fsNo,
      mrcCode: salesOrders.mrcCode,
      itemName: items.name,
      itemUnit: items.unit,
      countryOfOrigin: salesOrderLines.countryOfOrigin,
      brandName: salesOrderLines.brandName,
      qty: salesOrderLines.qty,
      unitPrice: salesOrderLines.unitPrice,
      vatAmount: salesOrderLines.vatAmount,
      total: salesOrderLines.total,
      costPrice: items.costPrice,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(salesOrderLines, eq(salesOrderLines.salesOrderId, salesOrders.id))
    .leftJoin(items, eq(salesOrderLines.itemId, items.id))
    .where(between(salesOrders.date, startStr, endStr))
    .orderBy(salesOrders.date)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')

  // Header rows
  ws.mergeCells('A1:N1')
  ws.getCell('A1').value = 'KATERINAFARALDI'
  ws.getCell('A1').font = { bold: true, size: 12 }

  ws.mergeCells('A2:N2')
  ws.getCell('A2').value = 'VAT Sales Summary'

  ws.mergeCells('A3:N3')
  ws.getCell('A3').value = `From ${formatEcMonth(ecYear, ecMonth)}`

  ws.mergeCells('A4:N4')
  ws.getCell('A4').value = 'TIN 0007036896'

  ws.mergeCells('A5:N5')
  ws.getCell('A5').value = `ከ ${formatEcMonth(ecYear, ecMonth)} የተከናወነ የእያንዳንዱ ሽያጭ መረጃ መመዝገቢያ ቅጽ`

  // Column headers row 6
  const headerRow = ws.addRow(AM_HEADERS)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }

  // Data rows
  rows.forEach((r, i) => {
    const qty = Number(r.qty || 0)
    const unitPrice = Number(r.unitPrice || 0)
    const vatAmount = Number(r.vatAmount || 0)
    const total = Number(r.total || 0)
    ws.addRow([
      i + 1,
      r.itemName,
      r.countryOfOrigin ?? '',
      r.brandName ?? '',
      r.itemUnit,
      qty,
      Number(r.costPrice || 0),
      unitPrice,
      vatAmount,
      total,
      qty * total,
      r.fsNo,
      formatEcDate(new Date(r.saleDate!)),
      r.mrcCode ?? '',
    ])
  })

  // Column widths
  ws.columns = [
    { width: 6 }, { width: 30 }, { width: 15 }, { width: 18 },
    { width: 10 }, { width: 10 }, { width: 18 }, { width: 18 },
    { width: 14 }, { width: 18 }, { width: 14 }, { width: 18 },
    { width: 22 }, { width: 18 },
  ]

  const buffer = await wb.xlsx.writeBuffer()

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="vat-register-${ecYear}-${ecMonth}.xlsx"`)
  return buffer
})
```

- [ ] **Step 3: Commit**

```bash
git add server/api/reports/
git commit -m "feat: vat register api and erca excel export"
```

---

## Task 12: VAT Register Page

**Files:**
- Create: `pages/reports/index.vue`

- [ ] **Step 1: Create reports page**

```vue
<!-- pages/reports/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const now = new Date()
// Default to current EC month — approximate (Gregorian month - 8 offset for EC)
const defaultEcYear = ref(2018)
const defaultEcMonth = ref(6)

const ecYear = ref(defaultEcYear.value)
const ecMonth = ref(defaultEcMonth.value)

const { data: report, refresh } = await useFetch(
  () => `/api/reports/vat-register?ec_year=${ecYear.value}&ec_month=${ecMonth.value}`
)

const columns = [
  { key: 'sn',           label: 'ተ.ቁ',      width: '50px' },
  { key: 'itemName',     label: 'Item' },
  { key: 'countryOfOrigin', label: 'Origin', width: '90px' },
  { key: 'brandName',    label: 'Brand',     width: '110px' },
  { key: 'unit',         label: 'Unit',      width: '60px' },
  { key: 'qty',          label: 'Qty',       numeric: true, width: '70px' },
  { key: 'unitSalePrice',label: 'Sale Price', numeric: true, width: '110px' },
  { key: 'vatAmount',    label: 'VAT (15%)', numeric: true, width: '100px' },
  { key: 'grandTotal',   label: 'Total',     numeric: true, width: '110px' },
  { key: 'fsNo',         label: 'FS No',     width: '130px' },
  { key: 'saleDate',     label: 'Date (EC)', width: '140px' },
]

const months = [
  { value: 1,  label: 'መስከረም (1)' },
  { value: 2,  label: 'ጥቅምት (2)' },
  { value: 3,  label: 'ህዳር (3)' },
  { value: 4,  label: 'ታህሳስ (4)' },
  { value: 5,  label: 'ጥር (5)' },
  { value: 6,  label: 'የካቲት (6)' },
  { value: 7,  label: 'መጋቢት (7)' },
  { value: 8,  label: 'ሚያዝያ (8)' },
  { value: 9,  label: 'ግንቦት (9)' },
  { value: 10, label: 'ሰኔ (10)' },
  { value: 11, label: 'ሐምሌ (11)' },
  { value: 12, label: 'ነሐሴ (12)' },
]

function fmt(n: number) {
  return n.toLocaleString('en-ET', { minimumFractionDigits: 2 })
}

async function downloadExcel() {
  const url = `/api/reports/vat-register-export?ec_year=${ecYear.value}&ec_month=${ecMonth.value}`
  const a = document.createElement('a')
  a.href = url
  a.download = `vat-register-${ecYear.value}-${ecMonth.value}.xlsx`
  a.click()
}
</script>

<template>
  <div>
    <KPageHeader title="VAT Register" subtitle="Monthly ERCA sales report" />

    <div class="px-8 py-6">
      <!-- Controls -->
      <div class="flex items-end gap-4 mb-6">
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">EC Year</label>
          <input
            v-model.number="ecYear"
            type="number"
            min="2010"
            max="2030"
            class="w-28 bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text"
            @change="refresh()"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">EC Month</label>
          <select
            v-model.number="ecMonth"
            class="bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text"
            @change="refresh()"
          >
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <button
          class="flex items-center gap-2 border border-text text-text px-4 py-2 text-sm font-medium hover:bg-text hover:text-bg transition-colors"
          @click="downloadExcel"
        >
          ↓ Export ERCA Excel
        </button>
      </div>

      <!-- Header info -->
      <div v-if="report" class="bg-surface border border-border px-4 py-3 mb-4 text-sm">
        <span class="font-medium">{{ (report as any).header.company }}</span>
        <span class="text-muted mx-2">·</span>
        <span class="font-mono text-xs">TIN {{ (report as any).header.tin }}</span>
        <span class="text-muted mx-2">·</span>
        <span>{{ (report as any).header.monthLabel }}</span>
        <span class="text-muted mx-2">·</span>
        <span class="text-muted">{{ (report as any).rows?.length ?? 0 }} lines</span>
      </div>

      <!-- Table -->
      <KTable :columns="columns" :rows="(report as any)?.rows ?? []" empty-message="No sales in this period." />

      <!-- Totals row -->
      <div v-if="report && (report as any).totals" class="mt-2 flex justify-end">
        <div class="w-80 border border-border text-sm">
          <div class="flex justify-between px-4 py-2 border-b border-border">
            <span class="text-muted">Total Subtotal</span>
            <span class="font-mono">{{ fmt((report as any).totals.subtotal) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2 border-b border-border">
            <span class="text-muted">Total VAT</span>
            <span class="font-mono">{{ fmt((report as any).totals.vat) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2 font-medium">
            <span>Grand Total</span>
            <span class="font-mono">{{ fmt((report as any).totals.total) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate to `/reports`. Select year 2018, month 6 (የካቲት). If you have sales data in that period, rows appear. Click "Export ERCA Excel" — browser downloads `.xlsx` file. Open in Excel/LibreOffice and verify column headers match ERCA format.

- [ ] **Step 3: Commit**

```bash
git add pages/reports/
git commit -m "feat: vat register report page with erca excel export"
```

---

## Task 13: Dashboard

**Files:**
- Create: `server/api/dashboard/index.get.ts`
- Modify: `pages/index.vue`

- [ ] **Step 1: Dashboard API**

```typescript
// server/api/dashboard/index.get.ts
import { db } from '~/server/db/index'
import { salesOrders, purchaseOrders, items } from '~/server/db/schema'
import { sql, lt } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [salesResult] = await db
    .select({
      totalSales: sql<string>`COALESCE(SUM(grand_total), 0)`,
      totalVat: sql<string>`COALESCE(SUM(vat_amount), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(salesOrders)
    .where(sql`date BETWEEN ${monthStart} AND ${monthEnd}`)

  const [purchasesResult] = await db
    .select({
      totalPurchases: sql<string>`COALESCE(SUM(grand_total), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(purchaseOrders)
    .where(sql`date BETWEEN ${monthStart} AND ${monthEnd}`)

  const lowStockItems = await db
    .select({ id: items.id, name: items.name, stockQty: items.stockQty, unit: items.unit })
    .from(items)
    .where(lt(items.stockQty, '5'))

  const grossProfit = Number(salesResult.totalSales) - Number(salesResult.totalVat) - Number(purchasesResult.totalPurchases)

  return {
    month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    sales: {
      total: Number(salesResult.totalSales),
      vat: Number(salesResult.totalVat),
      count: Number(salesResult.count),
    },
    purchases: {
      total: Number(purchasesResult.totalPurchases),
      count: Number(purchasesResult.count),
    },
    grossProfit,
    lowStockItems,
  }
})
```

- [ ] **Step 2: Replace dashboard stub with real page**

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: stats } = await useFetch('/api/dashboard')

function fmt(n: number) {
  return n.toLocaleString('en-ET', { minimumFractionDigits: 2 })
}
</script>

<template>
  <div>
    <div class="px-8 pt-8 pb-6 border-b border-border">
      <h1 class="font-display text-2xl font-bold text-text">Dashboard</h1>
      <p class="mt-1 text-sm text-muted">{{ (stats as any)?.month }}</p>
    </div>

    <div class="px-8 py-8">
      <!-- Stats row -->
      <div class="grid grid-cols-4 gap-px bg-border mb-8">
        <div class="bg-bg px-6 py-5">
          <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Sales This Month</p>
          <p class="font-mono text-2xl font-bold text-text">{{ fmt((stats as any)?.sales?.total ?? 0) }}</p>
          <p class="text-xs text-muted mt-1">{{ (stats as any)?.sales?.count ?? 0 }} invoices · VAT {{ fmt((stats as any)?.sales?.vat ?? 0) }}</p>
        </div>
        <div class="bg-bg px-6 py-5">
          <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Purchases This Month</p>
          <p class="font-mono text-2xl font-bold text-text">{{ fmt((stats as any)?.purchases?.total ?? 0) }}</p>
          <p class="text-xs text-muted mt-1">{{ (stats as any)?.purchases?.count ?? 0 }} orders</p>
        </div>
        <div class="bg-bg px-6 py-5">
          <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Gross Profit</p>
          <p
            class="font-mono text-2xl font-bold"
            :class="(stats as any)?.grossProfit >= 0 ? 'text-text' : 'text-red'"
          >
            {{ fmt((stats as any)?.grossProfit ?? 0) }}
          </p>
          <p class="text-xs text-muted mt-1">Sales ex-VAT minus purchases</p>
        </div>
        <div class="bg-bg px-6 py-5">
          <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Low Stock Items</p>
          <p class="font-mono text-2xl font-bold" :class="(stats as any)?.lowStockItems?.length > 0 ? 'text-red' : 'text-text'">
            {{ (stats as any)?.lowStockItems?.length ?? 0 }}
          </p>
          <p class="text-xs text-muted mt-1">Items with qty &lt; 5</p>
        </div>
      </div>

      <!-- Low stock alert -->
      <div v-if="(stats as any)?.lowStockItems?.length > 0">
        <h2 class="font-display text-base font-bold text-text mb-3">Low Stock</h2>
        <div class="border border-border">
          <div
            v-for="item in (stats as any).lowStockItems"
            :key="item.id"
            class="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-surface"
          >
            <span class="text-sm text-text">{{ item.name }}</span>
            <span class="font-mono text-sm text-red font-medium">{{ item.stockQty }} {{ item.unit }}</span>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="mt-8">
        <h2 class="font-display text-base font-bold text-text mb-3">Quick Actions</h2>
        <div class="flex gap-3">
          <NuxtLink to="/purchases" class="border border-border px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors">
            + New Purchase
          </NuxtLink>
          <NuxtLink to="/sales" class="bg-text text-bg px-4 py-2.5 text-sm font-medium hover:bg-red transition-colors">
            + New Sale
          </NuxtLink>
          <NuxtLink to="/reports" class="border border-border px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors">
            VAT Report
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verify dashboard**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. Confirm:
- 4 stat cells render in a horizontal row separated by 1px borders (grid trick)
- Numbers use JetBrains Mono font
- Low stock items list shows if any items have qty < 5
- Quick action buttons navigate correctly

- [ ] **Step 4: Commit**

```bash
git add server/api/dashboard/ pages/index.vue
git commit -m "feat: dashboard with monthly stats, gross profit, and low stock alerts"
```

---

## Task 14: Final End-to-End Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: 0 TypeScript errors. Build output in `.output/`.

- [ ] **Step 3: End-to-end walkthrough**

Start server: `npm run dev`

Run through this scenario manually:

1. `/items` — Create "Sticker Paper 172GSM" (unit: Pcs, cost: 29739, sale: 35000)
2. `/suppliers` — Create "Robera PLC" (TIN: 0000007776)
3. `/customers` — Create a test customer (TIN: 123456, VAT reg: ABC)
4. `/purchases` — Create purchase: Robera PLC, 4x Sticker Paper @ 29739.132, VAT 4460.87
   - Verify stock becomes 4 in `/items`
5. `/sales` — Create sale: test customer, FS No "00001", 1x Sticker Paper @ 35000
   - Verify stock becomes 3 in `/items`
   - Click through to detail → click "Print Invoice" → verify invoice matches Katerina template
6. `/reports` — Select correct EC year/month → verify sale appears → click "Export ERCA Excel" → open file
7. `/` Dashboard — verify monthly stats reflect the transactions above

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: plan-b complete — all features verified"
```

---

## Done

Both plans complete. The system now handles:
- ✅ Item catalog with stock tracking
- ✅ Supplier + customer directories  
- ✅ Purchase orders with weighted average inventory costing
- ✅ Sales orders with automatic 15% VAT calculation
- ✅ Insufficient stock guard
- ✅ Katerina VAT invoice print template (pixel-matched)
- ✅ Monthly VAT register (screen + ERCA Excel export with EC dates)
- ✅ Dashboard with gross profit and low stock alerts
