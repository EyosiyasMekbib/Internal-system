# Electron Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Katerina Nuxt 4 ERP web app into a self-contained Electron desktop app that ships a single installer (.dmg / .exe) with no external PostgreSQL dependency.

**Architecture:** Electron's main process builds the Nuxt/Nitro server as a child process, pointing it at a local SQLite file stored in the OS user-data directory. The BrowserWindow loads `http://localhost:<port>` once the server is ready. PostgreSQL is replaced by SQLite via Drizzle's sqlite-core adapter + `better-sqlite3`.

**Tech Stack:** Electron 30+, electron-builder 24+, better-sqlite3, drizzle-orm/better-sqlite3, TypeScript (ts-node for electron main in dev), Nuxt 4 / Nitro (unchanged), Better-Auth (sqlite provider).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `electron/main.ts` | Electron main process: finds free port, starts Nitro child, opens BrowserWindow |
| Create | `electron/preload.ts` | Minimal preload script (contextIsolation) |
| Create | `electron-builder.config.ts` | Packaging config for mac/win |
| Modify | `server/db/schema.ts` | Rewrite all column types from pg-core → sqlite-core |
| Modify | `server/db/index.ts` | Switch driver from `postgres` → `better-sqlite3` |
| Modify | `server/auth.ts` | Change `provider: 'pg'` → `provider: 'sqlite'` |
| Modify | `drizzle.config.ts` | Change dialect to `sqlite` |
| Modify | `nuxt.config.ts` | Add `nitro.output` path, disable Google Fonts in production |
| Modify | `package.json` | Add deps + `electron:dev` / `electron:build` scripts |
| Generate | `server/db/migrations/` | Fresh SQLite migrations (via drizzle-kit) |

---

### Task 1: Install Electron and SQLite dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install electron better-sqlite3
npm install --save-dev electron-builder @electron/rebuild concurrently wait-on
```

- [ ] **Step 2: Install Drizzle SQLite types (already in drizzle-orm)**

Drizzle sqlite-core is part of the existing `drizzle-orm` package — no separate install needed.

- [ ] **Step 3: Verify installs**

```bash
node -e "require('better-sqlite3'); console.log('ok')"
npx electron --version
```

Expected: prints `ok` and a version like `v30.x.x`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install electron, better-sqlite3, electron-builder"
```

---

### Task 2: Rewrite database schema for SQLite

**Files:**
- Modify: `server/db/schema.ts`

The PostgreSQL-specific imports (`pgTable`, `uuid`, `numeric`, `timestamp`, `boolean`) must be replaced with SQLite equivalents. Rules:
- `pgTable` → `sqliteTable`
- `uuid('id').defaultRandom()` → `text('id').$defaultFn(() => crypto.randomUUID())`
- `numeric('x', {precision, scale})` → `text('x')` (stores decimal strings, same as PG Drizzle behaviour)
- `timestamp('x').defaultNow()` → `integer('x', { mode: 'timestamp' }).$defaultFn(() => new Date())`
- `date('x')` → `text('x')` (ISO strings, unchanged behaviour)
- `boolean('x').default(false)` → `integer('x', { mode: 'boolean' }).default(false)`
- `index(name).on(col)` → same import from sqlite-core
- `unique(name).on(col)` → same import from sqlite-core
- Foreign key refs syntax is identical

- [ ] **Step 1: Replace the entire schema file**

```typescript
// server/db/schema.ts
import {
  sqliteTable, text, integer, index, unique
} from 'drizzle-orm/sqlite-core'

// ── better-auth tables ─────────────────────────────────────────────────────

export const authUser = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const authSession = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
})

export const authAccount = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const authVerification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// ── app tables ────────────────────────────────────────────────────────────

export const items = sqliteTable('items', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  stockQty: text('stock_qty').notNull().default('0'),
  costPrice: text('cost_price').notNull().default('0'),
  salePrice: text('sale_price').notNull().default('0'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const suppliers = sqliteTable('suppliers', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  name: text('name').notNull(),
  tin: text('tin'),
  vatRegNo: text('vat_reg_no'),
  phone: text('phone'),
  address: text('address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const customers = sqliteTable('customers', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  name: text('name').notNull(),
  tin: text('tin'),
  vatRegNo: text('vat_reg_no'),
  phone: text('phone'),
  address: text('address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const purchaseOrders = sqliteTable('purchase_orders', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  supplierId: text('supplier_id').notNull().references(() => suppliers.id),
  date: text('date').notNull(),
  voucherNo: text('voucher_no'),
  subtotal: text('subtotal').notNull().default('0'),
  vatAmount: text('vat_amount').notNull().default('0'),
  grandTotal: text('grand_total').notNull().default('0'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [index('purchase_orders_supplier_idx').on(t.supplierId)])

export const purchaseOrderLines = sqliteTable('purchase_order_lines', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  purchaseOrderId: text('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id),
  countryOfOrigin: text('country_of_origin'),
  brandName: text('brand_name'),
  qty: text('qty').notNull(),
  unitPrice: text('unit_price').notNull(),
  total: text('total').notNull(),
})

export const salesOrders = sqliteTable('sales_orders', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  date: text('date').notNull(),
  fsNo: text('fs_no').notNull(),
  subtotal: text('subtotal').notNull().default('0'),
  vatAmount: text('vat_amount').notNull().default('0'),
  grandTotal: text('grand_total').notNull().default('0'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [index('sales_orders_customer_idx').on(t.customerId)])

export const salesOrderLines = sqliteTable('sales_order_lines', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  salesOrderId: text('sales_order_id').notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id),
  countryOfOrigin: text('country_of_origin'),
  brandName: text('brand_name'),
  costPrice: text('cost_price').notNull().default('0'),
  qty: text('qty').notNull(),
  unitPrice: text('unit_price').notNull(),
  vatAmount: text('vat_amount').notNull(),
  total: text('total').notNull(),
})

export const employees = sqliteTable('employees', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  tin: text('tin').notNull(),
  fullName: text('full_name').notNull(),
  pensionId: text('pension_id'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  basicSalary: text('basic_salary').notNull(),
  transportAllowance: text('transport_allowance').notNull().default('0'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const payrollRuns = sqliteTable('payroll_runs', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  month: text('month').notNull(),
  year: text('year').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [unique('payroll_runs_month_year_unique').on(t.month, t.year)])

export const payslips = sqliteTable('payslips', {
  id: text('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  payrollRunId: text('payroll_run_id').notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  basicSalary: text('basic_salary').notNull(),
  transportAllowance: text('transport_allowance').notNull().default('0'),
  taxableTransportAllowance: text('taxable_transport_allowance').notNull().default('0'),
  overTime: text('over_time').notNull().default('0'),
  otherTaxableBenefit: text('other_taxable_benefit').notNull().default('0'),
  totalTaxable: text('total_taxable').notNull(),
  taxWithheld: text('tax_withheld').notNull(),
  costSharing: text('cost_sharing').notNull(),
  employerPension: text('employer_pension').notNull(),
  netPay: text('net_pay').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors from schema.ts (other pre-existing errors are OK to ignore for now)

- [ ] **Step 3: Commit**

```bash
git add server/db/schema.ts
git commit -m "feat(db): migrate schema from pg-core to sqlite-core"
```

---

### Task 3: Switch DB connection driver to better-sqlite3

**Files:**
- Modify: `server/db/index.ts`

- [ ] **Step 1: Replace the DB connection**

```typescript
// server/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

const dbPath = process.env.DATABASE_PATH ?? './katerina.db'
const sqlite = new Database(dbPath)

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
```

- [ ] **Step 2: Confirm module resolves**

```bash
node -e "
process.env.DATABASE_PATH = '/tmp/test-katerina.db';
import('./server/db/index.ts').catch(e => console.error(e.message))
" 2>&1 | head -5
```

Expected: no `Cannot find module` errors (TypeScript not resolved here — that's fine; we verify via tsc)

- [ ] **Step 3: Commit**

```bash
git add server/db/index.ts
git commit -m "feat(db): switch from postgres.js to better-sqlite3"
```

---

### Task 4: Update Better-Auth to use SQLite adapter

**Files:**
- Modify: `server/auth.ts`

- [ ] **Step 1: Update auth configuration**

```typescript
// server/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db/index'
import { authUser, authSession, authAccount, authVerification } from './db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET ?? 'katerina-desktop-secret',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
})
```

Note: `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are set by the Electron main process at runtime.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -i "auth.ts" | head -10
```

Expected: no errors in auth.ts

- [ ] **Step 3: Commit**

```bash
git add server/auth.ts
git commit -m "feat(auth): switch better-auth drizzle adapter to sqlite provider"
```

---

### Task 5: Update drizzle.config.ts and generate SQLite migrations

**Files:**
- Modify: `drizzle.config.ts`
- Generate: `server/db/migrations/` (new SQLite migration files)

- [ ] **Step 1: Update drizzle config**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './katerina.db',
  },
})
```

- [ ] **Step 2: Delete old PostgreSQL migrations**

```bash
rm -rf /Users/eyosiyasmekbib/Documents/Projects/Katerina/Internal\ system/server/db/migrations
```

- [ ] **Step 3: Generate fresh SQLite migrations**

```bash
npx drizzle-kit generate
```

Expected: creates `server/db/migrations/0000_*.sql` with SQLite-compatible CREATE TABLE statements

- [ ] **Step 4: Inspect migration to verify SQLite syntax**

```bash
cat server/db/migrations/0000_*.sql | head -40
```

Expected: lines like `CREATE TABLE \`items\` (...)` with backtick quoting (SQLite style)

- [ ] **Step 5: Commit**

```bash
git add drizzle.config.ts server/db/migrations/
git commit -m "feat(db): generate SQLite migrations, switch drizzle dialect"
```

---

### Task 6: Fix the dashboard raw SQL for SQLite compatibility

**Files:**
- Modify: `server/api/dashboard/index.get.ts`

The dashboard uses `sql\`date BETWEEN ${start} AND ${end}\`` which is valid SQLite. However `SUM`, `COUNT`, `COALESCE` are all standard SQL — no changes needed for those. The only risk is the bare column name `date` which SQLite handles fine. Verify:

- [ ] **Step 1: Read the file and confirm no pg-specific syntax**

```bash
grep -n "pg\|::text\|NOW()\|gen_random_uuid\|RETURNING" server/api/dashboard/index.get.ts
```

Expected: no output (none of those pg-specific keywords are present)

- [ ] **Step 2: stockQty column — add it if missing from schema**

The dashboard references `items.stockQty` but the original schema.ts didn't have it. The new schema.ts in Task 2 already includes `stockQty: text('stock_qty')`. Verify it's there:

```bash
grep "stockQty\|stock_qty" server/db/schema.ts
```

Expected: `stockQty: text('stock_qty').notNull().default('0'),`

- [ ] **Step 3: Commit (no code changes if grep confirms OK)**

```bash
git add server/api/dashboard/index.get.ts
git commit -m "chore: confirm dashboard API is SQLite compatible (no changes needed)" --allow-empty
```

---

### Task 7: Update nuxt.config.ts for desktop build

**Files:**
- Modify: `nuxt.config.ts`

In production (packaged Electron app) there's no internet, so Google Fonts won't load. We need to either inline fonts or skip them in production. We'll keep font links but note they degrade gracefully (system fonts fallback). More importantly, we need to tell Nitro to look at the right output path.

- [ ] **Step 1: Update nuxt.config.ts**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    databasePath: process.env.DATABASE_PATH,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
  },
  typescript: { strict: true },
})
```

Note: changed `databaseUrl` → `databasePath` to match the new env var name.

- [ ] **Step 2: Commit**

```bash
git add nuxt.config.ts
git commit -m "chore(nuxt): update runtimeConfig key from databaseUrl to databasePath"
```

---

### Task 8: Create Electron main process

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

- [ ] **Step 1: Create the preload script**

```typescript
// electron/preload.ts
// Minimal preload - contextIsolation is enabled by default.
// Add contextBridge.exposeInMainWorld() calls here if you need
// to expose native Electron APIs to the renderer.
```

- [ ] **Step 2: Create the main process**

```typescript
// electron/main.ts
import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { fork, ChildProcess } from 'child_process'
import { createServer } from 'net'
import { existsSync } from 'fs'

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null

// Find a free TCP port
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as { port: number }).port
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

// Poll until the server responds on /api/health or root
function waitForServer(port: number, attempts = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let tries = 0
    const check = () => {
      const req = require('http').get(`http://127.0.0.1:${port}/`, (res: any) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        tries++
        if (tries >= attempts) return reject(new Error('Server did not start'))
        setTimeout(check, 500)
      })
      req.end()
    }
    check()
  })
}

async function startServer(): Promise<number> {
  const port = await getFreePort()

  // In development, use the running nuxt dev server
  if (!app.isPackaged) {
    return 3000 // assume `npm run dev` is running
  }

  const serverPath = join(process.resourcesPath, 'app', '.output', 'server', 'index.mjs')
  if (!existsSync(serverPath)) {
    throw new Error(`Nitro server not found at: ${serverPath}`)
  }

  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'katerina.db')

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATABASE_PATH: dbPath,
      BETTER_AUTH_SECRET: 'katerina-desktop-secret-change-in-prod',
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
      NODE_ENV: 'production',
    },
    silent: false,
  })

  serverProcess.on('error', (err) => {
    dialog.showErrorBox('Server Error', err.message)
  })

  await waitForServer(port)
  return port
}

async function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Katerina ERP',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    const port = await startServer()
    await createWindow(port)
  } catch (err: any) {
    dialog.showErrorBox('Startup Error', err.message)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    try {
      const port = serverProcess ? Number(process.env._KATERINA_PORT) : await startServer()
      await createWindow(port)
    } catch (err: any) {
      dialog.showErrorBox('Startup Error', err.message)
    }
  }
})

app.on('before-quit', () => {
  serverProcess?.kill()
})
```

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts electron/preload.ts
git commit -m "feat(electron): add main process and preload script"
```

---

### Task 9: Add Electron build scripts and tsconfig

**Files:**
- Modify: `package.json`
- Create: `electron/tsconfig.json`

- [ ] **Step 1: Create tsconfig for electron/**

```json
// electron/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "target": "es2020",
    "outDir": "../dist-electron",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 2: Add scripts to package.json**

Open `package.json` and update the `scripts` section:

```json
{
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "electron:compile": "tsc -p electron/tsconfig.json",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron dist-electron/main.js\"",
    "electron:build": "npm run build && npm run electron:compile && electron-builder build --config electron-builder.config.ts",
    "electron:rebuild": "electron-rebuild -f -w better-sqlite3"
  }
}
```

- [ ] **Step 3: Run electron-rebuild to compile better-sqlite3 for Electron**

```bash
npm run electron:rebuild
```

Expected: outputs `✓ Rebuilt 1 module(s)` or similar. This compiles `better-sqlite3` against the Electron version of Node.

- [ ] **Step 4: Commit**

```bash
git add package.json electron/tsconfig.json
git commit -m "chore: add electron build scripts and tsconfig"
```

---

### Task 10: Create electron-builder config

**Files:**
- Create: `electron-builder.config.ts`

- [ ] **Step 1: Create the config**

```typescript
// electron-builder.config.ts
import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.katerina.erp',
  productName: 'Katerina ERP',
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: [
    'dist-electron/**/*',
    '.output/**/*',
    'node_modules/better-sqlite3/**/*',
    '!node_modules/better-sqlite3/src/**',
    '!node_modules/better-sqlite3/deps/**',
    '!**/*.map',
  ],
  extraResources: [
    { from: '.output', to: 'app/.output' },
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    category: 'public.app-category.business',
    icon: 'build/icon.icns',
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'build/icon.ico',
  },
  linux: {
    target: ['AppImage'],
    icon: 'build/icon.png',
    category: 'Office',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
}

export default config
```

- [ ] **Step 2: Create the build directory for icons (placeholder)**

```bash
mkdir -p build
# Add build/icon.icns, build/icon.ico, build/icon.png before final release
# For now, electron-builder will use its default icon
```

- [ ] **Step 3: Commit**

```bash
git add electron-builder.config.ts build/
git commit -m "chore: add electron-builder packaging config"
```

---

### Task 11: Compile Electron main and test dev mode

**Files:**
- No new files; testing integration

- [ ] **Step 1: Build Nuxt**

```bash
npm run build
```

Expected: `.output/` directory created with `server/index.mjs` and `public/`

- [ ] **Step 2: Compile Electron TypeScript**

```bash
npm run electron:compile
```

Expected: `dist-electron/main.js` and `dist-electron/preload.js` created

- [ ] **Step 3: Run in dev mode (separate terminal)**

In terminal A:
```bash
npm run dev
```

Wait until: `Nuxt 4 ready on http://localhost:3000`

In terminal B:
```bash
electron dist-electron/main.js
```

Expected: Electron window opens and loads the Katerina app at localhost:3000

- [ ] **Step 4: Verify login works**

Navigate to the login page. Create an account if needed and confirm the SQLite DB is created at `./katerina.db`.

```bash
ls -la katerina.db
```

Expected: file exists and has non-zero size

- [ ] **Step 5: Apply migrations on first run**

The Nitro server needs to run migrations on startup. Add a migration step to `server/db/index.ts`:

```typescript
// server/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'path'
import * as schema from './schema'

const dbPath = process.env.DATABASE_PATH ?? './katerina.db'
const sqlite = new Database(dbPath)

sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

// Run migrations synchronously on startup (safe: idempotent)
const migrationsFolder = process.env.MIGRATIONS_PATH
  ?? join(process.cwd(), 'server/db/migrations')

migrate(db, { migrationsFolder })
```

- [ ] **Step 6: Update electron/main.ts to pass MIGRATIONS_PATH for packaged app**

In `electron/main.ts`, inside the `startServer` function, add to the `env` object:

```typescript
MIGRATIONS_PATH: join(process.resourcesPath, 'app', '.output', 'server', 'db', 'migrations'),
```

Wait — Nitro bundles server code. Migrations need to be accessible at runtime. Add to `electron-builder.config.ts` `extraResources`:

```typescript
extraResources: [
  { from: '.output', to: 'app/.output' },
  { from: 'server/db/migrations', to: 'app/migrations' },
],
```

And update electron/main.ts env:
```typescript
MIGRATIONS_PATH: join(process.resourcesPath, 'app', 'migrations'),
```

- [ ] **Step 7: Commit**

```bash
git add server/db/index.ts electron/main.ts electron-builder.config.ts
git commit -m "feat(db): auto-run SQLite migrations on startup"
```

---

### Task 12: Package and test the production build

**Files:**
- No new files

- [ ] **Step 1: Build everything**

```bash
npm run electron:build
```

Expected: `release/` directory with `Katerina ERP-<version>.dmg` (on Mac)

- [ ] **Step 2: Install and open the DMG**

```bash
open release/*.dmg
```

Drag the app to Applications and open it.

Expected: App window opens, loads the Katerina login page

- [ ] **Step 3: Verify DB is created in userData**

```bash
ls ~/Library/Application\ Support/Katerina\ ERP/katerina.db
```

Expected: file exists

- [ ] **Step 4: Create a test purchase order end-to-end**

1. Log in
2. Create a supplier
3. Create an item
4. Create a purchase order with one line
5. Navigate to the dashboard and confirm the purchase shows in this month's summary

Expected: all operations succeed without errors

- [ ] **Step 5: Commit**

```bash
git add release/.gitkeep  # don't commit the binaries
git commit -m "feat: electron desktop app working end-to-end"
```

---

## Self-Review

**Spec coverage:**
- [x] Electron scaffolding with main process and BrowserWindow
- [x] Nitro server spawned as child process with env vars
- [x] PostgreSQL → SQLite schema migration (all tables)
- [x] better-sqlite3 driver with WAL mode
- [x] Better-auth sqlite provider
- [x] Auto-migration on startup
- [x] userData directory for DB file
- [x] electron-builder config for .dmg (Mac) and .nsis (Win)
- [x] Dev mode (Electron loads the running Nuxt dev server)
- [x] Production mode (Electron spawns built Nitro server)

**Gaps noted:**
- Icons: `build/icon.icns` / `build/icon.ico` need to be created with real artwork before shipping
- Google Fonts load from internet in production — if the machine is offline, fonts fall back to system fonts (acceptable)
- `stockQty` was referenced in dashboard but missing from original schema — added in Task 2
- Payroll export (`/api/payroll/[id]/export.get.ts`) and VAT export use ExcelJS — verify these work in the Electron context (should be fine, it's pure Node)

**Type consistency check:**
- `crypto.randomUUID()` used in `$defaultFn` — available in Node 19+. Electron 30 ships Node 20, so this is safe.
- `DATABASE_PATH` env var used consistently across `server/db/index.ts`, `drizzle.config.ts`, and `electron/main.ts`
- `MIGRATIONS_PATH` used in `server/db/index.ts` and set in `electron/main.ts`
