# Purchases, Sales & Document Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove stock tracking, add global settings (VAT rate + MRC code), and deliver three printable documents: Sales Invoice, Purchase Voucher, and VAT Sales Summary matching the exact Excel format.

**Architecture:** Schema migrations drop `stockQty`/`mrcCode` and add `costPrice` to sales lines + a new `settings` table. A settings API (GET/PATCH) feeds a settings page and is read by both the sales form (VAT rate) and print templates (MRC code). Three print components cover the document requirements.

**Tech Stack:** Nuxt 4, Drizzle ORM, PostgreSQL, Vitest, ExcelJS (already installed), Ethiopian Calendar utilities in `server/utils/ec-dates.ts`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `server/db/schema.ts` | Remove `stockQty`, `mrcCode`; add `costPrice` to `salesOrderLines`; add `settings` table |
| Create | `server/api/settings/index.get.ts` | Return all settings as flat object |
| Create | `server/api/settings/index.patch.ts` | Upsert one or more setting keys |
| Modify | `server/api/purchases/index.post.ts` | Remove stock update logic |
| Modify | `server/api/sales/index.post.ts` | Remove stock deduction; capture `costPrice` per line |
| Modify | `server/api/reports/vat-register.get.ts` | Use `salesOrderLines.costPrice`; read MRC from settings |
| Modify | `server/api/reports/vat-register-export.get.ts` | Same: line costPrice + MRC from settings |
| Create | `app/pages/settings.vue` | VAT rate + MRC code form |
| Modify | `app/components/AppSidebar.vue` | Add Settings nav link |
| Modify | `app/pages/sales/index.vue` | Remove `mrcCode` field; fetch VAT rate from settings |
| Modify | `app/pages/sales/[id].vue` | Remove `mrcCode` display; MRC shown in invoice from settings |
| Modify | `app/components/print/SalesInvoice.vue` | Fix logo; fetch MRC from settings at print time |
| Create | `app/components/print/PurchaseVoucher.vue` | Printable purchase voucher |
| Modify | `app/pages/purchases/[id].vue` | Mount `PurchaseVoucher`, ensure print button works |
| Modify | `app/pages/reports/vat.vue` | Rebuild to match Excel layout exactly |
| Modify | `tests/schema.test.ts` | Add `settings` table assertion |
| Copy | `public/logo.png` | Logo accessible at `/logo.png` for print templates |

---

## Task 1: Copy logo to public directory

**Files:**
- Copy: `logo.png` → `public/logo.png`

- [ ] **Step 1: Copy logo**

```bash
cp logo.png public/logo.png
```

- [ ] **Step 2: Verify**

```bash
ls public/logo.png
```
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add public/logo.png
git commit -m "feat: add logo to public dir for print templates"
```

---

## Task 2: Schema changes

**Files:**
- Modify: `server/db/schema.ts`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Update schema**

Open `server/db/schema.ts`. Apply these changes:

**`items` table** — remove the `stockQty` line:
```ts
// REMOVE this line:
stockQty: numeric('stock_qty', { precision: 12, scale: 4 }).notNull().default('0'),
```

**`salesOrders` table** — remove `mrcCode`:
```ts
// REMOVE this line:
mrcCode: text('mrc_code'),
```

**`salesOrderLines` table** — add `costPrice` after `brandName`:
```ts
costPrice: numeric('cost_price', { precision: 12, scale: 4 }).notNull().default('0'),
```

**New `settings` table** — add after `salesOrderLines`:
```ts
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
```

- [ ] **Step 2: Update schema test**

Open `tests/schema.test.ts`. Add `settings` to the import and assertion:

```ts
import { items, suppliers, customers, purchaseOrders, purchaseOrderLines, salesOrders, salesOrderLines, settings } from '../server/db/schema'

describe('schema exports', () => {
  it('exports all tables', () => {
    expect(items).toBeDefined()
    expect(suppliers).toBeDefined()
    expect(customers).toBeDefined()
    expect(purchaseOrders).toBeDefined()
    expect(purchaseOrderLines).toBeDefined()
    expect(salesOrders).toBeDefined()
    expect(salesOrderLines).toBeDefined()
    expect(settings).toBeDefined()
  })
})
```

- [ ] **Step 3: Run schema test**

```bash
npx vitest tests/schema.test.ts --run
```
Expected: PASS

- [ ] **Step 4: Generate migration**

```bash
npx drizzle-kit generate
```
Expected: new migration file created in `server/db/migrations/`.

- [ ] **Step 5: Apply migration**

```bash
npx drizzle-kit migrate
```
Expected: migration applied successfully.

- [ ] **Step 6: Seed settings**

```bash
npx tsx -e "
import { db } from './server/db/index.ts'
import { settings } from './server/db/schema.ts'
await db.insert(settings).values([
  { key: 'vat_rate', value: '0.15' },
  { key: 'mrc_code', value: '' },
]).onConflictDoNothing()
console.log('Settings seeded')
process.exit(0)
"
```
Expected: `Settings seeded`

- [ ] **Step 7: Commit**

```bash
git add server/db/schema.ts tests/schema.test.ts server/db/migrations/
git commit -m "feat: schema — remove stock tracking, add settings table, costPrice on sales lines"
```

---

## Task 3: Settings API

**Files:**
- Create: `server/api/settings/index.get.ts`
- Create: `server/api/settings/index.patch.ts`

- [ ] **Step 1: Create GET handler**

Create `server/api/settings/index.get.ts`:
```ts
import { db } from '~~/server/db/index'
import { settings } from '~~/server/db/schema'

export default defineEventHandler(async () => {
  const rows = await db.select().from(settings)
  return Object.fromEntries(rows.map(r => [r.key, r.value])) as {
    vat_rate: string
    mrc_code: string
  }
})
```

- [ ] **Step 2: Create PATCH handler**

Create `server/api/settings/index.patch.ts`:
```ts
import { db } from '~~/server/db/index'
import { settings } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as Record<string, string>
  const allowed = ['vat_rate', 'mrc_code']

  for (const [key, value] of Object.entries(body)) {
    if (!allowed.includes(key)) continue
    await db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
  }

  const rows = await db.select().from(settings)
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
})
```

- [ ] **Step 3: Smoke-test (dev server must be running)**

```bash
curl -s http://localhost:3000/api/settings
```
Expected: `{"vat_rate":"0.15","mrc_code":""}`

```bash
curl -s -X PATCH http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"mrc_code":"TEST123"}'
```
Expected: `{"vat_rate":"0.15","mrc_code":"TEST123"}`

- [ ] **Step 4: Commit**

```bash
git add server/api/settings/
git commit -m "feat: settings API — GET and PATCH endpoints"
```

---

## Task 4: Settings page + sidebar

**Files:**
- Create: `app/pages/settings.vue`
- Modify: `app/components/AppSidebar.vue`

- [ ] **Step 1: Create settings page**

Create `app/pages/settings.vue`:
```vue
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: s, refresh } = await useFetch('/api/settings')

const form = reactive({
  vat_rate: '',
  mrc_code: '',
})

watchEffect(() => {
  if (s.value) {
    form.vat_rate = String(Number((s.value as any).vat_rate) * 100)
    form.mrc_code = (s.value as any).mrc_code ?? ''
  }
})

const saving = ref(false)

async function save() {
  saving.value = true
  await $fetch('/api/settings', {
    method: 'PATCH',
    body: {
      vat_rate: String(Number(form.vat_rate) / 100),
      mrc_code: form.mrc_code,
    },
  })
  await refresh()
  saving.value = false
}
</script>

<template>
  <div>
    <KPageHeader title="Settings" subtitle="Global system configuration" />
    <div class="px-8 py-8 max-w-md">
      <form class="space-y-6" @submit.prevent="save">
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
            VAT Rate (%)
          </label>
          <input
            v-model="form.vat_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text"
          />
          <p class="text-xs text-muted mt-1">Enter as percentage, e.g. 15 for 15%</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
            MRC Code
          </label>
          <input
            v-model="form.mrc_code"
            class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text"
            placeholder="Machine Registration Code"
          />
          <p class="text-xs text-muted mt-1">Printed on sales invoices and VAT summary</p>
        </div>
        <button
          type="submit"
          :disabled="saving"
          class="bg-text text-bg px-6 py-2.5 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : 'Save Settings' }}
        </button>
      </form>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Add Settings to sidebar**

Open `app/components/AppSidebar.vue`. Replace the `links` array:
```ts
const links = [
  { href: '/',          label: 'Dashboard', icon: '▤' },
  { href: '/items',     label: 'Items',      icon: '◫' },
  { href: '/customers', label: 'Customers',  icon: '◎' },
  { href: '/suppliers', label: 'Suppliers',  icon: '◈' },
  { href: '/purchases', label: 'Purchases',  icon: '↓' },
  { href: '/sales',     label: 'Sales',      icon: '↑' },
  { href: '/reports',   label: 'VAT Report', icon: '≡' },
  { href: '/settings',  label: 'Settings',   icon: '⚙' },
]
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/settings`. Confirm Settings appears in sidebar, form shows VAT rate (15) and MRC code fields. Change MRC to a test value, save, refresh — value persists.

- [ ] **Step 4: Commit**

```bash
git add app/pages/settings.vue app/components/AppSidebar.vue
git commit -m "feat: settings page and sidebar link"
```

---

## Task 5: Remove stock tracking from purchases

**Files:**
- Modify: `server/api/purchases/index.post.ts`

- [ ] **Step 1: Strip inventory update from purchases**

Replace the entire contents of `server/api/purchases/index.post.ts` with:
```ts
import { db } from '~~/server/db/index'
import { purchaseOrders, purchaseOrderLines } from '~~/server/db/schema'

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
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const vatAmount = body.vatAmount != null ? Number(body.vatAmount) : 0
  const grandTotal = subtotal + vatAmount

  return await db.transaction(async (tx) => {
    const [order] = await tx.insert(purchaseOrders).values({
      supplierId: body.supplierId,
      date: body.date,
      voucherNo: body.voucherNo ?? null,
      subtotal: String(subtotal.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      notes: body.notes ?? null,
    }).returning()

    for (const line of lines) {
      await tx.insert(purchaseOrderLines).values({
        purchaseOrderId: order.id,
        itemId: line.itemId,
        countryOfOrigin: line.countryOfOrigin ?? null,
        brandName: line.brandName ?? null,
        qty: String(line.qty),
        unitPrice: String(line.unitPrice),
        total: String((line.qty * line.unitPrice).toFixed(2)),
      })
    }

    return order
  })
})
```

- [ ] **Step 2: Verify a purchase can be created**

With dev server running, open `http://localhost:3000/purchases`, create a new purchase order. Confirm it saves without error. Check DB — no stock_qty column references.

- [ ] **Step 3: Commit**

```bash
git add server/api/purchases/index.post.ts
git commit -m "feat: remove stock tracking from purchase creation"
```

---

## Task 6: Remove stock deduction from sales, capture costPrice

**Files:**
- Modify: `server/api/sales/index.post.ts`

- [ ] **Step 1: Update sales creation**

Replace the entire contents of `server/api/sales/index.post.ts` with:
```ts
import { db } from '~~/server/db/index'
import { salesOrders, salesOrderLines, items, settings } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const lineSchema = z.object({
  itemId: z.string().uuid(),
  countryOfOrigin: z.string().optional(),
  brandName: z.string().optional(),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
})

const schema = z.object({
  customerId: z.string().uuid(),
  date: z.string(),
  fsNo: z.string(),
  lines: z.array(lineSchema).min(1),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  // Read VAT rate from settings
  const vatSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'vat_rate') })
  const vatRate = Number(vatSetting?.value ?? '0.15')

  return await db.transaction(async (tx) => {
    let subtotal = 0
    let totalVat = 0

    // Pre-fetch item cost prices
    const lineData = await Promise.all(body.lines.map(async (line) => {
      const item = await tx.query.items.findFirst({ where: eq(items.id, line.itemId) })
      if (!item) throw createError({ statusCode: 404, message: `Item ${line.itemId} not found` })
      const lineSubtotal = line.qty * line.unitPrice
      const vatAmount = Math.round(lineSubtotal * vatRate * 100) / 100
      subtotal += lineSubtotal
      totalVat += vatAmount
      return { ...line, costPrice: item.costPrice, vatAmount }
    }))

    const grandTotal = subtotal + totalVat

    const [order] = await tx.insert(salesOrders).values({
      customerId: body.customerId,
      date: body.date,
      fsNo: body.fsNo,
      notes: body.notes ?? null,
      subtotal: subtotal.toFixed(2),
      vatAmount: totalVat.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
    }).returning()

    if (!order) throw createError({ statusCode: 500, message: 'Failed to create sales order' })

    for (const line of lineData) {
      const lineTotal = line.qty * line.unitPrice + line.vatAmount
      await tx.insert(salesOrderLines).values({
        salesOrderId: order.id,
        itemId: line.itemId,
        countryOfOrigin: line.countryOfOrigin,
        brandName: line.brandName,
        qty: line.qty.toString(),
        unitPrice: line.unitPrice.toString(),
        costPrice: line.costPrice,
        vatAmount: line.vatAmount.toString(),
        total: lineTotal.toFixed(2),
      })
    }

    return order
  })
})
```

- [ ] **Step 2: Verify sales creation**

Create a new sale at `http://localhost:3000/sales`. Confirm it saves. Open the DB and check `sales_order_lines` — `cost_price` column should have the item's cost price value.

- [ ] **Step 3: Commit**

```bash
git add server/api/sales/index.post.ts
git commit -m "feat: remove stock deduction from sales, capture costPrice per line"
```

---

## Task 7: Update VAT register APIs

**Files:**
- Modify: `server/api/reports/vat-register.get.ts`
- Modify: `server/api/reports/vat-register-export.get.ts`

- [ ] **Step 1: Update vat-register.get.ts**

Replace the full file:
```ts
import { db } from '~~/server/db/index'
import { salesOrders, salesOrderLines, customers, items, settings } from '~~/server/db/schema'
import { eq, between } from 'drizzle-orm'
import { ecMonthDateRange, toEthiopian, formatEcDate, formatEcMonth } from '~~/server/utils/ec-dates'

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

  const mrcSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'mrc_code') })
  const mrcCode = mrcSetting?.value ?? ''

  const rows = await db
    .select({
      saleDate: salesOrders.date,
      fsNo: salesOrders.fsNo,
      itemName: items.name,
      itemUnit: items.unit,
      countryOfOrigin: salesOrderLines.countryOfOrigin,
      brandName: salesOrderLines.brandName,
      qty: salesOrderLines.qty,
      unitPrice: salesOrderLines.unitPrice,
      costPrice: salesOrderLines.costPrice,
      vatAmount: salesOrderLines.vatAmount,
      total: salesOrderLines.total,
    })
    .from(salesOrders)
    .leftJoin(customers, eq(salesOrders.customerId, customers.id))
    .leftJoin(salesOrderLines, eq(salesOrderLines.salesOrderId, salesOrders.id))
    .leftJoin(items, eq(salesOrderLines.itemId, items.id))
    .where(between(salesOrders.date, startStr, endStr))
    .orderBy(salesOrders.date)

  const totals = rows.reduce((acc, r) => ({
    qty: acc.qty + Number(r.qty || 0),
    subtotal: acc.subtotal + Number(r.qty || 0) * Number(r.unitPrice || 0),
    vat: acc.vat + Number(r.vatAmount || 0),
    total: acc.total + Number(r.total || 0),
  }), { qty: 0, subtotal: 0, vat: 0, total: 0 })

  return {
    header: {
      company: 'KATERINA FARALDI',
      tin: '0007036896',
      monthLabel: formatEcMonth(ecYear, ecMonth),
      ecYear,
      ecMonth,
    },
    rows: rows.map((r, i) => {
      const qty = Number(r.qty || 0)
      const unitPrice = Number(r.unitPrice || 0)
      const vatAmount = Number(r.vatAmount || 0)
      const lineTotal = qty * unitPrice + vatAmount
      return {
        sn: i + 1,
        itemName: r.itemName,
        countryOfOrigin: r.countryOfOrigin ?? '',
        brandName: r.brandName ?? '',
        unit: r.itemUnit,
        qty: r.qty,
        costPrice: r.costPrice,
        unitPrice: r.unitPrice,
        vatAmount: r.vatAmount,
        lineTotal: lineTotal.toFixed(2),
        lineTotalWithVat: lineTotal.toFixed(2),
        fsNo: r.fsNo,
        saleDate: formatEcDate(new Date(r.saleDate!)),
        mrcCode,
      }
    }),
    totals,
  }
})
```

- [ ] **Step 2: Update vat-register-export.get.ts**

Replace the `mrcCode` and `costPrice` references in the query and row mapping:

In the `.select()` block, change:
```ts
// REMOVE:
mrcCode: salesOrders.mrcCode,
costPrice: items.costPrice,

// ADD:
costPrice: salesOrderLines.costPrice,
```

In the data rows section, change:
```ts
// REMOVE:
r.mrcCode ?? '',

// ADD (get mrcCode from settings before the query):
```

Add this before the DB query:
```ts
const mrcSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'mrc_code') })
const mrcCode = mrcSetting?.value ?? ''
```

Add `settings` to the import:
```ts
import { salesOrders, salesOrderLines, customers, items, settings } from '~~/server/db/schema'
```

Replace the row data array entry for column 14 from `r.mrcCode ?? ''` to `mrcCode`.

Also fix the K column calculation (column 11 in the row data array) from `qty * total` to:
```ts
(qty * unitPrice + vatAmount),
```

- [ ] **Step 3: Commit**

```bash
git add server/api/reports/vat-register.get.ts server/api/reports/vat-register-export.get.ts
git commit -m "feat: vat register APIs — use line costPrice and settings MRC"
```

---

## Task 8: Update sales form — settings-driven VAT, remove mrcCode

**Files:**
- Modify: `app/pages/sales/index.vue`
- Modify: `app/pages/sales/[id].vue`

- [ ] **Step 1: Update sales/index.vue**

Replace the `<script setup>` block:
```ts
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

type Line = { itemId: string; countryOfOrigin: string; brandName: string; qty: number; unitPrice: number }

const form = reactive({
  customerId: '',
  date: new Date().toISOString().split('T')[0],
  fsNo: '',
  lines: [] as Line[],
})

function addLine() {
  form.lines.push({ itemId: '', countryOfOrigin: '', brandName: '', qty: 1, unitPrice: 0 })
}

function removeLine(i: number) {
  form.lines.splice(i, 1)
}

function lineVat(line: Line) {
  return Math.round(line.qty * line.unitPrice * vatRate.value * 100) / 100
}

function openNew() {
  Object.assign(form, {
    customerId: '', date: new Date().toISOString().split('T')[0],
    fsNo: '', lines: [],
  })
  addLine()
  showForm.value = true
}

const subtotal = computed(() => form.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))
const totalVat = computed(() => form.lines.reduce((s, l) => s + lineVat(l), 0))
const grandTotal = computed(() => subtotal.value + totalVat.value)

async function save() {
  await $fetch('/api/sales', { method: 'POST', body: { ...form } })
  showForm.value = false
  refresh()
}
```

In the template, remove the MRC Code field entirely (the `<div>` with `v-model="form.mrcCode"`). Change the `grid-cols-2` header section to single column for FS No. Remove the `vatAmount` field from line items — show VAT as read-only computed display only. Update the line grid from `grid-cols-5` to `grid-cols-4` (remove the manual VAT input):

```html
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
```

- [ ] **Step 2: Update sales/[id].vue — remove mrcCode display**

Open `app/pages/sales/[id].vue`. Remove the MRC Code `<div>` block from the grid (change from `grid-cols-4` to `grid-cols-3`):
```html
<div class="grid grid-cols-3 gap-6 mb-6 text-sm">
```
Remove:
```html
<div>
  <p class="text-xs text-muted uppercase tracking-wide mb-1">MRC Code</p>
  <p class="font-mono">{{ (order as any)?.mrcCode || '—' }}</p>
</div>
```

Also add `itemUnit` and `vatAmount` to the lines query — open `server/api/sales/[id].get.ts` and add them to the select:
```ts
itemUnit: items.unit,
vatAmount: salesOrderLines.vatAmount,
```

- [ ] **Step 3: Commit**

```bash
git add app/pages/sales/index.vue app/pages/sales/[id].vue server/api/sales/[id].get.ts
git commit -m "feat: sales form uses settings VAT rate, remove mrcCode from sales"
```

---

## Task 9: Fix Sales Invoice print template

**Files:**
- Modify: `app/components/print/SalesInvoice.vue`

- [ ] **Step 1: Update SalesInvoice.vue**

Replace the full file:
```vue
<script setup lang="ts">
const props = defineProps<{
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

const { data: appSettings } = await useFetch('/api/settings')
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
</script>

<template>
  <div class="invoice-print hidden print:block font-[Arial] text-[11px] text-[#000] p-8 max-w-[210mm] mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-start mb-4">
      <div>
        <img src="/logo.png" alt="Katerina" class="h-14 mb-1" />
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
          <td colspan="5" class="border border-[#000] px-2 py-1 text-right font-bold">ተ.እ.ታ ({{ vatRate }}) / VAT ({{ vatRate }})</td>
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

    <!-- Footer -->
    <div class="mt-2 text-[8px] text-center border-t border-[#000] pt-1 flex justify-between">
      <span>ካሽ ፊስካል ወይም ተመላሽ ደረሰኝ ካልተሰጠ ዋጋ የለውም</span>
      <span>INVALID WITHOUT FISCAL OR REFUND RECEIPT ATTACHED</span>
    </div>
    <div class="text-[8px] text-right">
      MACHINE REGISTRATION CODE: <span class="font-mono">{{ mrcCode }}</span>
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

- [ ] **Step 2: Verify invoice prints correctly**

Go to `http://localhost:3000/sales`, open a sale, click Print Invoice. In print preview confirm: logo appears top-left, company info top-right, MRC code shows at bottom (from settings).

- [ ] **Step 3: Commit**

```bash
git add app/components/print/SalesInvoice.vue
git commit -m "feat: sales invoice — fix logo, MRC from settings"
```

---

## Task 10: Purchase Voucher print component

**Files:**
- Create: `app/components/print/PurchaseVoucher.vue`
- Modify: `app/pages/purchases/[id].vue`

- [ ] **Step 1: Create PurchaseVoucher.vue**

Create `app/components/print/PurchaseVoucher.vue`:
```vue
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
```

- [ ] **Step 2: Mount PurchaseVoucher in purchases/[id].vue**

Open `app/pages/purchases/[id].vue`. Add the import and mount the component:

At the top of `<script setup>`:
```ts
import PurchaseVoucher from '~/components/print/PurchaseVoucher.vue'
```

Just before the closing `</div>` of the template, add:
```html
<PurchaseVoucher v-if="order" :order="(order as any)" />
```

Also update the `server/api/purchases/[id].get.ts` to include `itemUnit` in the lines select:
```ts
itemUnit: items.unit,
```

- [ ] **Step 3: Verify purchase voucher prints**

Go to `http://localhost:3000/purchases`, open a purchase, click Print. In print preview confirm: logo, supplier info, line items table, totals, signature lines all appear.

- [ ] **Step 4: Commit**

```bash
git add app/components/print/PurchaseVoucher.vue app/pages/purchases/[id].vue server/api/purchases/[id].get.ts
git commit -m "feat: purchase voucher print component"
```

---

## Task 11: VAT Sales Summary — rebuild reports/vat.vue

**Files:**
- Modify: `app/pages/reports/vat.vue`

- [ ] **Step 1: Replace reports/vat.vue entirely**

```vue
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const ecYear = ref(2018)
const ecMonth = ref(6)

const { data: report, refresh } = await useFetch('/api/reports/vat-register', {
  query: computed(() => ({ ec_year: ecYear.value, ec_month: ecMonth.value }))
})

const months = [
  { value: 1,  label: 'Meskerem (Sep/Oct)' },
  { value: 2,  label: 'Tikimt (Oct/Nov)' },
  { value: 3,  label: 'Hidar (Nov/Dec)' },
  { value: 4,  label: 'Tahsas (Dec/Jan)' },
  { value: 5,  label: 'Tir (Jan/Feb)' },
  { value: 6,  label: 'Yekatit (Feb/Mar)' },
  { value: 7,  label: 'Megabit (Mar/Apr)' },
  { value: 8,  label: 'Miazia (Apr/May)' },
  { value: 9,  label: 'Ginbot (May/Jun)' },
  { value: 10, label: 'Sene (Jun/Jul)' },
  { value: 11, label: 'Hamle (Jul/Aug)' },
  { value: 12, label: 'Nehase (Aug/Sep)' },
  { value: 13, label: 'Pagume (Sep)' },
]

function fmt(n: string | number | null | undefined) {
  return Number(n || 0).toLocaleString('en-ET', { minimumFractionDigits: 2 })
}

const ecMonthName = computed(() => months.find(m => m.value === ecMonth.value)?.label.split(' ')[0] ?? '')
</script>

<template>
  <div>
    <!-- Screen controls -->
    <div class="px-8 pt-8 pb-6 border-b border-border flex items-center justify-between print:hidden">
      <div>
        <h1 class="font-display text-2xl font-bold">VAT Sales Summary</h1>
        <p class="text-sm text-muted mt-1">Monthly VAT register — Ethiopian Calendar</p>
      </div>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-sm">
          <span class="text-muted">EC Year</span>
          <input type="number" v-model="ecYear" class="bg-surface border border-border px-2 py-1 outline-none focus:border-text w-24" />
        </label>
        <label class="flex items-center gap-2 text-sm">
          <span class="text-muted">Month</span>
          <select v-model="ecMonth" class="bg-surface border border-border px-2 py-1 outline-none focus:border-text">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </label>
        <a
          :href="`/api/reports/vat-register-export?ec_year=${ecYear}&ec_month=${ecMonth}`"
          class="bg-surface border border-border px-4 py-2 text-sm font-medium hover:bg-surface2 transition-colors"
        >
          Export Excel
        </a>
        <button
          class="bg-text text-bg px-4 py-2 text-sm font-medium hover:bg-red transition-colors"
          onclick="window.print()"
        >
          Print
        </button>
      </div>
    </div>

    <!-- Print / screen report -->
    <div v-if="report" class="p-6 print:p-4">
      <!-- Company header block -->
      <div class="mb-3 print:mb-2">
        <div class="font-bold text-[13px]">{{ (report as any).header.company }}</div>
        <div class="text-[12px]">VAT Sales Summary</div>
        <div class="text-[11px]">From {{ (report as any).header.monthLabel }}</div>
        <div class="text-[11px]">TIN {{ (report as any).header.tin }}</div>
      </div>

      <!-- Amharic title row -->
      <div class="border border-[#000] px-2 py-1 text-[10px] mb-0 font-medium bg-[#f5f5f5]">
        ከ {{ ecMonthName }} 01/{{ ecYear }} ዓ.ም እስከ {{ ecMonthName }} 30/{{ ecYear }} ዓ.ም የተከናወነ የእያንዳንዱ ሽያጭ መረጃ መመዝገቢያ ቅጽ
      </div>

      <!-- 14-column register table -->
      <table class="w-full text-[9px] border border-[#000]" style="border-collapse: collapse">
        <thead>
          <tr class="bg-[#d3d3d3]">
            <th class="border border-[#000] px-1 py-1 text-center w-6">ተ.ቁ</th>
            <th class="border border-[#000] px-1 py-1 text-left min-w-[100px]">የተሸጠው የዕቃ መጠሪያ (A)</th>
            <th class="border border-[#000] px-1 py-1 text-left w-16">የስሪት ሀገር (B)</th>
            <th class="border border-[#000] px-1 py-1 text-left w-16">Brand Name (C)</th>
            <th class="border border-[#000] px-1 py-1 text-center w-10">መለኪያ</th>
            <th class="border border-[#000] px-1 py-1 text-right w-10">ብዛት (D)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-20">የአንዱ አማካይ ግዢ ዋጋ (E)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-20">የአንዱ ሽያጭ ዋጋ ከ ተ.እ.ታ በፊት (F)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-16">የተ.እ.ታ (G)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-20">ጠቅላላ ዋጋ ታክስ ጨምሮ H(F+G)</th>
            <th class="border border-[#000] px-1 py-1 text-right w-20">ጠቅላላ ዋጋ ተ.እ.ታ ጨምሮ K</th>
            <th class="border border-[#000] px-1 py-1 text-center w-16">የሽያጭ ደረሰኝ ቁጥር (FS No.) (J)</th>
            <th class="border border-[#000] px-1 py-1 text-center w-16">ሽያጩ የተከናወነበት ቀን (J)</th>
            <th class="border border-[#000] px-1 py-1 text-center w-16">MRC (K)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in (report as any).rows" :key="row.sn" class="hover:bg-[#fafafa]">
            <td class="border border-[#000] px-1 py-0.5 text-center">{{ row.sn }}</td>
            <td class="border border-[#000] px-1 py-0.5">{{ row.itemName }}</td>
            <td class="border border-[#000] px-1 py-0.5">{{ row.countryOfOrigin }}</td>
            <td class="border border-[#000] px-1 py-0.5">{{ row.brandName }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-center">{{ row.unit }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.qty) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.costPrice) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.unitPrice) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.vatAmount) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.lineTotal) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-right font-mono">{{ fmt(row.lineTotalWithVat) }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-center font-mono">{{ row.fsNo }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-center">{{ row.saleDate }}</td>
            <td class="border border-[#000] px-1 py-0.5 text-center font-mono">{{ row.mrcCode }}</td>
          </tr>
          <!-- Totals row -->
          <tr class="bg-[#eee] font-bold">
            <td colspan="5" class="border border-[#000] px-2 py-1 text-right">ድምር / Totals</td>
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.qty) }}</td>
            <td class="border border-[#000] px-1 py-1" />
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.subtotal) }}</td>
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.vat) }}</td>
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.total) }}</td>
            <td class="border border-[#000] px-1 py-1 text-right font-mono">{{ fmt((report as any).totals.total) }}</td>
            <td colspan="3" class="border border-[#000] px-1 py-1" />
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="px-8 py-12 text-center text-muted text-sm">
      No data for selected period.
    </div>
  </div>
</template>

<style>
@media print {
  .print\:hidden { display: none !important; }
}
</style>
```

- [ ] **Step 2: Verify VAT report**

Go to `http://localhost:3000/reports`. Select a year/month that has sales data. Confirm: company header shows, Amharic title row shows, 14-column table renders with correct data. Click Print — print preview should match the Excel layout.

- [ ] **Step 3: Test Export Excel still works**

Click "Export Excel". File should download as `.xlsx` with the same column structure.

- [ ] **Step 4: Commit**

```bash
git add app/pages/reports/vat.vue
git commit -m "feat: VAT Sales Summary page — exact Excel format with 14-column register"
```

---

## Self-Review Checklist

- [x] Schema: `stockQty` removed, `mrcCode` removed from `salesOrders`, `costPrice` added to `salesOrderLines`, `settings` table created
- [x] Purchases: stock update logic removed from `index.post.ts`
- [x] Sales: stock deduction removed, `costPrice` captured per line, `mrcCode` removed from form and schema validation
- [x] Settings API: GET + PATCH implemented with allowed-key guard
- [x] Settings page: VAT rate displayed as %, stored as decimal; MRC field present
- [x] Sidebar: Settings link added
- [x] VAT register APIs: both `.get.ts` and `-export.get.ts` use `salesOrderLines.costPrice` and settings MRC
- [x] VAT report page: calls `/api/reports/vat-register`, 14-column table, Amharic headers, company block
- [x] Sales invoice: logo from `/logo.png`, MRC from settings, VAT rate from settings
- [x] Purchase voucher: new component, mounted in `/purchases/[id]`
- [x] Logo: `public/logo.png` in place
- [x] Schema test updated with `settings` table assertion
