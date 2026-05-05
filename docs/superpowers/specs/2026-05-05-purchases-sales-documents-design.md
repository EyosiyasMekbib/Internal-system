# Katerina: Purchases, Sales & Document Generation Design

**Date:** 2026-05-05

## Overview

Redesign the purchase/sales creation flow to remove stock tracking, introduce a global settings system (VAT rate + MRC code), and implement three printable documents: Sales Attachment Cash Invoice, Purchase Voucher, and VAT Sales Summary.

---

## 1. Schema Changes

### `items` table
- **Remove:** `stockQty` column
- **Keep:** `costPrice` — manually maintained per item, used as "Unit Average Cost" in VAT register

### `salesOrders` table
- **Remove:** `mrcCode` column — MRC now lives in settings

### `salesOrderLines` table
- **Add:** `costPrice NUMERIC(12,4) NOT NULL DEFAULT '0'` — captures `items.costPrice` at time of sale (for VAT register column E)

### New `settings` table
```sql
CREATE TABLE settings (
  key  TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```
Seeded with:
| key | value |
|-----|-------|
| `vat_rate` | `0.15` |
| `mrc_code` | `''` |

---

## 2. API Changes

### Remove stock tracking logic

**`server/api/purchases/index.post.ts`**
- Remove: item fetch, `weightedAverageCost` call, `items` update (stockQty + costPrice)
- Keep: order insert, line inserts, totals calculation

**`server/api/sales/index.post.ts`**
- Remove: `items` stockQty deduction
- Add: fetch `items.costPrice` per line, store it on `salesOrderLines.costPrice`

### New settings API

**`GET /api/settings`**
Returns `{ vat_rate: string, mrc_code: string }` (all keys as flat object).

**`PATCH /api/settings`**
Accepts partial `{ vat_rate?: string, mrc_code?: string }`, upserts each key.

### Updated VAT report API

**`GET /api/reports/vat`** — return line-item level data instead of order-level:
```ts
{
  ecYear: number
  ecMonth: number
  monthLabel: string        // e.g. "Yekatit 1-30, 2018 EC"
  lines: {
    no: number
    itemName: string
    countryOfOrigin: string
    brandName: string
    unit: string
    qty: string
    costPrice: string       // column E: unit average cost
    unitPrice: string       // column F: unit sale price ex-VAT
    vatAmount: string       // column G
    lineTotal: string       // column H: qty × unitPrice + vatAmount
    lineTotalWithVat: string // column K: qty × (unitPrice + vatAmount/qty) — total incl. VAT
    fsNo: string
    date: string
    mrcCode: string
  }[]
  totals: {
    subtotal: string
    vatAmount: string
    grandTotal: string
  }
}
```

---

## 3. Global Settings

### Settings page (`/settings`)
- Accessible from sidebar (new nav item)
- Form with two fields:
  - **VAT Rate (%)** — displayed as percentage (e.g. `15`), stored as decimal (`0.15`)
  - **MRC Code** — text field
- Save button calls `PATCH /api/settings`

### VAT rate usage
- **Sales creation (frontend):** fetch `GET /api/settings` on page load; use `vat_rate` for live per-line VAT calculation display
- **Sales creation (backend):** read `vat_rate` from settings table; recalculate and validate VAT per line server-side before storing
- **Purchases:** VAT remains a manually entered lump-sum field — settings rate not used

### MRC code usage
- Read from settings at print time in Sales Invoice and VAT Summary
- Not stored on individual orders

---

## 4. Documents

### A) Sales Attachment Cash Invoice

**File:** `app/components/print/SalesInvoice.vue` (update existing)

**Triggered from:** `/sales/[id]` — "Print Invoice" button

**Layout (matching `docs/KAT Attachment.jpg` exactly):**
- Top: Katerina logo (left) + company info block (right): ካተሪና ፍራልዲ / Katerina Faraldi, TIN, VAT reg, address, phone
- Dark title bar: "Attachment Cash Invoice"
- Customer info block (bordered table):
  - Row 1: ለ/To: [customer name] | ቁጥ/Date: [date]
  - Row 2: Customer's TIN No. | FS No.
  - Row 3: Customer's VAT Reg. No. | (empty)
  - Row 4: Date of Registration (colspan 2)
- Line items table: No. | Description | Unit | Qty | Unit Price | Total Price
  - Minimum 8 rows (pad empty rows)
- Footer totals: ድምር/Total | ተ.እ.ታ (15%)/VAT | ጠቅላላ ዋጋ/Grand Total
- Amount in words (ETB)
- Payment mode: Cash ☐ / Check ☐ | Cheque No. | Approved by
- Cashier name & signature line
- Footer: fiscal disclaimer (Amharic + English) | MRC code (from settings)

**Logo:** Use `/logo.png` (the actual Katerina logo asset)

**Props:** same structure as current, minus `mrcCode` (fetched from settings at print time)

---

### B) Purchase Voucher

**File:** `app/components/print/PurchaseVoucher.vue` (new)

**Triggered from:** `/purchases/[id]` — "Print Voucher" button

**Layout:**
- Top: Katerina logo (left) + company info block (right)
- Dark title bar: "Purchase Order Voucher"
- Supplier info block (bordered table):
  - Row 1: Supplier: [name] | Date: [date]
  - Row 2: Voucher No.: [voucherNo] | (empty)
- Line items table: No. | Description | Origin | Brand | Unit | Qty | Unit Price | Total
- Footer totals: Subtotal | VAT | Grand Total
- Notes field (if present)
- Signature line: Prepared by | Approved by | Received by

---

### C) VAT Sales Summary

**File:** `app/pages/reports/vat.vue` (replace current content)

**Layout (matching `docs/የካቲት 2018_2.xlsx` exactly):**

**Header block:**
```
KATERINA FARALDI
VAT Sales Summary
From [Month] [Day1]-[DayLast], [Year] EC
TIN 0007036896
```

**Amharic title row (full width, merged):**
`ከ [EC month] 01/[year] ዓ.ም እስከ [EC month] [last day]/[year] ዓ.ም የተከናወነ የእያንዳንዱ ሽያጭ መረጃ መመዝገቢያ ቅጽ`

**14-column table:**
| Col | Header (Amharic/English) | Data source |
|-----|--------------------------|-------------|
| ተ.ቁ | No. | row index |
| A | የተሸጠው የዕቃ መጠሪያ (A) | `itemName` |
| B | የስሪት ሀገር (B) | `countryOfOrigin` |
| C | Brand Name (C) | `brandName` |
| - | መለኪያ | `unit` |
| D | ብዛት (D) | `qty` |
| E | የአንዱ አማካይ ግዢ ዋጋ (Unit Average Cost) (E) | `costPrice` |
| F | የአንዱ ሽያጭ ዋጋ ከ ተ.እ.ታ በፊት (F) | `unitPrice` |
| G | የተ.እ.ታ /ቲ.ኦ.ቲ / (G) | `vatAmount` |
| H | ጠቅላላ ዋጋ ታክስ ጨምሮ H (F+G) | `lineTotal` |
| K | ጠቅላላ ዋጋ ተ.እ.ታ ጨምሮ K=(F×J) | `lineTotalWithVat` |
| J | ሽያጭ ደረሰኝ ቁጥር (FS No) (J) | `fsNo` |
| J | ሽያጩ የተከናወነበት ቀን (J) | `date` |
| K | የሽያጭ መመዝገቢያ መለኪያ ኮድ /MRC/ (K) | `mrcCode` |

**Totals row** at bottom.

**Controls (screen only, hidden on print):** EC Year + Month selectors, Print button.

---

## 5. Navigation

Add **Settings** to `AppSidebar.vue` nav — below reports.

---

## 6. Migrations

Run in order:
1. Remove `stock_qty` from `items`
2. Remove `mrc_code` from `sales_orders`
3. Add `cost_price` to `sales_order_lines`
4. Create `settings` table + seed rows

---

## 7. Out of Scope

- Stock alerts or reorder points
- Excel file download (VAT summary is print/PDF only)
- Multi-currency
- Purchase return / sales return
