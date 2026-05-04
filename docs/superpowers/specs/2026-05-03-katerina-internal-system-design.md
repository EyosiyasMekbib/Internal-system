# Katerina Internal System — Design Spec
**Date:** 2026-05-03  
**Company:** Katerina Faraldi (TIN: 0007036896, VAT: 14234090819)  
**Stack:** Nuxt 3 · Better Auth · Drizzle ORM · PostgreSQL · Tailwind CSS · shadcn-vue

---

## 1. Overview

Single-user internal web app for Katerina Faraldi Barcode Solutions. Manages purchase orders, sales invoices, inventory, and monthly Ethiopian VAT (ERCA) reporting.

**Core goals:**
- Track purchases from suppliers and sales to VAT-registered customers
- Maintain real-time inventory with weighted average costing
- Generate print-ready documents matching official Katerina invoice template
- Auto-produce monthly VAT register in exact ERCA Excel format (EC dates)

---

## 2. Stack

| Layer | Technology |
|---|---|
| Full-stack framework | Nuxt 3 (Nitro server routes) |
| Auth | Better Auth (email/password, sessions in DB) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Neon serverless or local Docker) |
| Styling | Tailwind CSS + shadcn-vue |
| Excel export | ExcelJS |
| EC date conversion | `ethiopian-calendar` npm package |
| Print/PDF | Browser print CSS (`@media print`) |

---

## 3. Architecture

```
katerina-internal/
├── server/
│   ├── api/
│   │   ├── items/         [GET, POST, PUT, DELETE]
│   │   ├── suppliers/     [GET, POST, PUT, DELETE]
│   │   ├── customers/     [GET, POST, PUT, DELETE]
│   │   ├── purchases/     [GET, POST] + purchases/[id].get.ts
│   │   ├── sales/         [GET, POST] + sales/[id].get.ts
│   │   └── reports/
│   │       └── vat-register.get.ts   ← summary + Excel export
│   ├── db/
│   │   ├── schema.ts      ← Drizzle table definitions
│   │   └── index.ts       ← DB client
│   └── auth.ts            ← Better Auth config
├── pages/
│   ├── index.vue          ← Dashboard
│   ├── items/
│   ├── suppliers/
│   ├── customers/
│   ├── purchases/
│   ├── sales/
│   └── reports/
├── components/
│   ├── InvoicePrint.vue   ← Print template (Katerina format)
│   ├── PurchasePrint.vue  ← Print template (voucher format)
│   └── shared/
└── nuxt.config.ts
```

**Request flow:**
```
Browser → Nuxt page → server/api/* (Nitro) → Drizzle → PostgreSQL
                            ↕
                     Better Auth session middleware
```

All API routes protected by Better Auth. Single user, no roles.

---

## 4. Data Model

### `items`
```
id              uuid PK
name            text NOT NULL
unit            text NOT NULL          -- e.g. "Pcs", "Roll", "Box"
cost_price      numeric(12,4) NOT NULL
sale_price      numeric(12,4) NOT NULL
stock_qty       numeric(12,4) DEFAULT 0
created_at      timestamptz
updated_at      timestamptz
```

### `suppliers`
```
id              uuid PK
name            text NOT NULL
tin             text
vat_reg_no      text
phone           text
address         text
created_at      timestamptz
```

### `customers`
```
id              uuid PK
name            text NOT NULL
tin             text
vat_reg_no      text
phone           text
address         text
created_at      timestamptz
```

### `purchase_orders`
```
id              uuid PK
supplier_id     uuid FK → suppliers
date            date NOT NULL
voucher_no      text               -- e.g. "CS2-00397-PB"
subtotal        numeric(14,2)
vat_amount      numeric(14,2)
grand_total     numeric(14,2)
notes           text
created_at      timestamptz
```

### `purchase_order_lines`
```
id              uuid PK
purchase_order_id  uuid FK → purchase_orders
item_id         uuid FK → items
country_of_origin  text
brand_name      text
qty             numeric(12,4)
unit_price      numeric(12,4)
total           numeric(14,2)   -- qty × unit_price
```

### `sales_orders`
```
id              uuid PK
customer_id     uuid FK → customers
date            date NOT NULL
fs_no           text NOT NULL      -- Fiscal receipt number
mrc_code        text               -- Machine registration code
subtotal        numeric(14,2)
vat_amount      numeric(14,2)      -- 15% of subtotal
grand_total     numeric(14,2)
notes           text
created_at      timestamptz
```

### `sales_order_lines`
```
id              uuid PK
sales_order_id  uuid FK → sales_orders
item_id         uuid FK → items
country_of_origin  text
brand_name      text
qty             numeric(12,4)
unit_price      numeric(12,4)      -- sale price before VAT
vat_amount      numeric(12,4)      -- 15% of (qty × unit_price)
total           numeric(14,2)      -- qty × unit_price + vat_amount
```

**Inventory logic (DB transaction on every purchase/sale save):**
- Purchase line saved → `items.stock_qty += qty`, recalculate weighted avg `cost_price`
- Sales line saved → `items.stock_qty -= qty`
- Both operations wrapped in a single transaction — never partial.

**Weighted average cost formula:**
```
new_cost_price = (current_stock × current_cost + qty × unit_price) / (current_stock + qty)
```

---

## 5. Pages & Features

| Route | Description |
|---|---|
| `/` | Dashboard: monthly sales total, purchases total, gross profit, low stock alerts, quick-add buttons |
| `/items` | Item catalog — CRUD, current stock, margin per item |
| `/customers` | Customer directory — name, TIN, VAT reg no., phone, address |
| `/suppliers` | Supplier directory — same fields |
| `/purchases` | List all purchase orders (date, supplier, total). Create new. |
| `/purchases/[id]` | View purchase order. Print button → voucher layout |
| `/sales` | List all sales orders (date, customer, FS no., total). Create new. |
| `/sales/[id]` | View sales order. Print button → Katerina VAT invoice layout |
| `/reports` | Monthly VAT register: pick month (EC), view summary table, export `.xlsx` |
| `/login` | Better Auth login page |

---

## 6. Document Print Templates

### Sales Invoice (`InvoicePrint.vue`)
Matches the official Katerina Faraldi "Attachment Cash Invoice" template exactly:
- Header: Katerina logo, company name (Amharic + English), TIN, VAT reg no., address, phone
- Customer block: customer TIN, VAT reg no., date of registration, FS No., date
- Line items table: ተ.ቁ, description, unit, qty, unit price, total price
- Footer: subtotal, VAT 15%, grand total, amount in words, mode of payment, cashier signature block
- Bilingual labels (Amharic / English)
- Watermark-style "ATTACHMENT" diagonal text on body
- Print CSS: A4, hide nav/sidebar, show only invoice

### Purchase Voucher (`PurchasePrint.vue`)
Matches Robera PLC-style cash sales voucher format:
- Supplier info block (TIN, MRC no., voucher no., date, store, cart, distribution)
- Line items: SN, item ID, description, qty, unit, unit amount, total
- Footer: subtotal, VAT 15%, grand total

---

## 7. VAT Register Export

**Endpoint:** `GET /api/reports/vat-register?year=2018&month=6` (EC year/month params)

**Screen view:** Summary table with all columns, totals row, month header in EC format.

**Excel export:** ExcelJS generates `.xlsx` matching exact ERCA column order:

| Col | Amharic label | Data |
|---|---|---|
| A | ተ.ቁ | Row serial number |
| B | የተሸጠው የዕቃ መጠሪያ | Item name |
| C | የስሪት ሀገር | Country of origin |
| D | Brand Name | Brand name |
| E | መለኪያ | Unit |
| F | ብዛት | Quantity |
| G | የአንዱ አማካይ ግዢ ዋጋ | Avg purchase cost |
| H | የአንዱ ሽያጭ ዋጋ ከ ተ.እ.ታ በፊት | Sale price before VAT |
| I | የተ.እ.ታ (15%) | VAT amount |
| J | ጠቅላላ ዋጋ ታክስ ጨምሮ | Grand total incl. VAT |
| K | K=(F×J) | Qty × grand total |
| L | የሽያጭ ደረሰኝ ቁጥር (FS No.) | FS number |
| M | ሽያጩ የተከናወነበት ቀን | Sale date (EC format) |
| N | MRC | MRC code |

Header rows auto-filled: "KATERINAFARALDI", TIN 0007036896, EC month range.  
Dates stored as Gregorian in DB, converted to EC on export using `ethiopian-calendar`.

---

## 8. Auth

Better Auth with email/password. Single account (the owner). Sessions stored in PostgreSQL. All `/api/*` routes return 401 if no valid session. Login page at `/login`, redirect to `/` on success.

---

## 9. Error Handling

- API routes return structured JSON errors: `{ error: string, code: string }`
- Inventory transaction failure → full rollback, 409 response
- Insufficient stock on sale → 422 with clear message
- Form validation client-side (Vee-Validate or Nuxt's built-in) + server-side (Zod)

---

## 10. Out of Scope (v1)

- Multi-user / roles
- Accounts payable / receivable aging
- Bank reconciliation
- TOT (Turnover Tax) — only VAT 15% for now
- Mobile app
- Email / SMS notifications
- Barcode scanning input
