# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start dev server (localhost:3000)
npm run build         # Production build
npm run preview       # Preview production build

# Database
docker compose up -d  # Start PostgreSQL on port 5434
npx drizzle-kit generate  # Generate migration from schema changes
npx drizzle-kit migrate   # Apply pending migrations

# Testing
npx vitest            # Run all tests
npx vitest tests/vat.test.ts  # Run a single test file
```

## Environment

Copy and set these before running:
```
DATABASE_URL=postgresql://katerina:katerina_dev@localhost:5434/katerina
BETTER_AUTH_SECRET=katerina-internal-secret-change-in-prod
BETTER_AUTH_URL=http://localhost:3000
```

## Architecture

**Katerina** is a Nuxt 4 internal ERP system for Ethiopian businesses — inventory management, purchase orders, sales orders, and VAT reporting.

### Request Flow

All `/api/*` routes (except `/api/auth/*`) are protected by `server/middleware/auth.ts`, which reads the better-auth session and returns 401 if missing. Client pages are additionally guarded by `app/middleware/auth.global.ts` (server-side only, redirects to `/login`).

### Database Layer (`server/db/`)

- `schema.ts` — single source of truth for all tables (Drizzle ORM)
- `index.ts` — exports a pre-configured Drizzle instance (`db`)
- `migrations/` — managed by drizzle-kit; never edit manually

**Key tables**: `items` (inventory with weighted-average cost), `purchaseOrders` + `purchaseOrderLines`, `salesOrders` + `salesOrderLines`, `suppliers`, `customers`. Better-auth manages `user`, `session`, `account`, `verification`.

### Inventory Logic

Purchase creation (`server/api/purchases/index.post.ts`) runs in a single DB transaction:
1. Insert purchase order header
2. Insert each line
3. Update `items.stockQty` and `items.costPrice` using **weighted-average cost**:
   `(currentStock × currentCost + addedQty × addedUnitCost) / (currentStock + addedQty)`

Sales creation (`server/api/sales/index.post.ts`) similarly:
1. Insert sales order header
2. Insert each line with per-line VAT at **15%**
3. Deduct from `items.stockQty`

### VAT & Ethiopian Calendar

- `server/utils/vat.ts` — `calcLineVat(qty, unitPrice)` and `calcOrderTotals(lines)`
- `server/utils/ec-dates.ts` — Ethiopian calendar conversion using the `ethiopian-date` library; used in the VAT register report to group transactions by Ethiopian month

### UI Design System

Defined in `app/assets/css/main.css` and `tailwind.config.ts`:
- **Colors**: CSS variables (`--color-bg`, `--color-surface`, `--color-text`, etc.) using oklch; mapped into Tailwind as `bg`, `surface`, `surface2`, `border`, `text`, `muted`, `red`
- **Fonts**: `font-display` (Libre Baskerville), `font-ui` (DM Sans), `font-mono` (JetBrains Mono)
- **Border radius**: 2px globally (`rounded` = `2px`)
- **Numeric columns**: `.tabular` CSS class for monospaced number alignment in tables

### Reusable Components

- `KTable.vue` — handles loading/empty states, row click, numeric column right-alignment, configurable column widths
- `KPageHeader.vue` — page title + subtitle + optional action button
- `KBadge.vue` — small status badge
- `AppSidebar.vue` — fixed navigation sidebar with sign-out
- `print/SalesInvoice.vue` — print template for sales invoices

### Testing

Tests live in `tests/`. Unit tests only (no DB or HTTP calls):
- `vat.test.ts` — VAT calculation utilities
- `schema.test.ts` — verifies all schema tables export correctly

Vitest uses `happy-dom` environment. No Nuxt test utilities wrappers needed for unit tests.
