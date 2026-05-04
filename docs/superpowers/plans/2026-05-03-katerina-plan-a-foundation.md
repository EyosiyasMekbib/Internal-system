# Katerina Internal System — Plan A: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Nuxt 3 full-stack app with PostgreSQL (Drizzle), Better Auth, Tailwind CSS, and the Katerina design system — fully wired up with login and a protected layout shell.

**Architecture:** Single Nuxt 3 repo with Nitro server routes for the API, Drizzle ORM talking to PostgreSQL, Better Auth for session-based auth stored in the same DB. All pages except `/login` are protected by a global auth middleware.

**Tech Stack:** Nuxt 3, Drizzle ORM, postgres.js, Better Auth, Tailwind CSS v4, shadcn-vue, Vitest, TypeScript

**Design System:** Industrial-editorial light mode. Libre Baskerville (display) + DM Sans (UI) + JetBrains Mono (numbers). Near-black on warm off-white. Katerina red (`oklch(44% 0.195 25)`) as surgical accent. Sharp 2px corners, no shadows.

---

## File Map

```
katerina-internal/
├── package.json
├── nuxt.config.ts
├── tailwind.config.ts          ← design tokens
├── drizzle.config.ts
├── .env.example
├── app.vue
├── server/
│   ├── auth.ts                 ← Better Auth instance
│   ├── db/
│   │   ├── index.ts            ← Drizzle client (postgres.js)
│   │   └── schema.ts           ← All table definitions
│   ├── middleware/
│   │   └── auth.ts             ← Nitro route middleware (protect /api/*)
│   └── routes/
│       └── auth/
│           └── [...].ts        ← Better Auth catch-all handler
├── middleware/
│   └── auth.global.ts          ← Nuxt page middleware (protect all pages)
├── pages/
│   ├── login.vue
│   └── index.vue               ← Dashboard stub (protected)
├── layouts/
│   └── default.vue             ← Sidebar + main content shell
├── components/
│   ├── AppSidebar.vue          ← Nav sidebar with Katerina branding
│   └── ui/                     ← shadcn-vue components (auto-generated)
├── composables/
│   └── useUser.ts              ← Reactive current user
├── assets/
│   ├── css/
│   │   └── main.css            ← Tailwind + CSS custom properties
│   └── images/
│       └── katerina-logo.png   ← Copy logo here
└── tests/
    └── setup.ts                ← Vitest setup
```

---

## Task 1: Scaffold Nuxt 3 Project

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `.env.example`, `tsconfig.json`

- [ ] **Step 1: Create project directory and scaffold**

```bash
cd "/Users/eyosiyasmekbib/Documents/Projects/Katerina/Internal system"
npx nuxi@latest init . --package-manager npm --no-git-init
```

Accept all prompts. This creates `nuxt.config.ts`, `app.vue`, `package.json`.

- [ ] **Step 2: Install all dependencies**

```bash
npm install drizzle-orm postgres better-auth exceljs ethiopian-date
npm install -D drizzle-kit @types/node vitest @nuxt/test-utils happy-dom
```

- [ ] **Step 3: Install Tailwind CSS v4 for Nuxt**

```bash
npm install -D @nuxtjs/tailwindcss
```

- [ ] **Step 4: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/katerina
BETTER_AUTH_SECRET=replace-with-random-32-char-string
BETTER_AUTH_URL=http://localhost:3000
EOF
cp .env.example .env
```

Fill `.env` with your actual `DATABASE_URL`.

- [ ] **Step 5: Configure `nuxt.config.ts`**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
  },
  typescript: { strict: true },
})
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Nuxt dev server running at `http://localhost:3000` with no errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold nuxt 3 project with dependencies"
```

---

## Task 2: Configure Drizzle + PostgreSQL

**Files:**
- Create: `server/db/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Write Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
  },
})
```

- [ ] **Step 2: Write test setup file**

```typescript
// tests/setup.ts
// intentionally empty — add global mocks here if needed
```

- [ ] **Step 3: Write failing test for DB connection**

```typescript
// tests/db.test.ts
import { describe, it, expect } from 'vitest'

describe('db client', () => {
  it('exports a drizzle instance', async () => {
    const mod = await import('../server/db/index')
    expect(mod.db).toBeDefined()
  })
})
```

- [ ] **Step 4: Run test — expect FAIL**

```bash
npx vitest run tests/db.test.ts
```

Expected: FAIL — `Cannot find module '../server/db/index'`

- [ ] **Step 5: Create Drizzle DB client**

```typescript
// server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

- [ ] **Step 6: Create empty schema file (required by index.ts)**

```typescript
// server/db/schema.ts
// Tables added in Task 3
export {}
```

- [ ] **Step 7: Create Drizzle config**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 8: Run test — expect PASS**

```bash
npx vitest run tests/db.test.ts
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add server/db/ drizzle.config.ts vitest.config.ts tests/
git commit -m "feat: configure drizzle orm with postgresql"
```

---

## Task 3: Write Database Schema

**Files:**
- Modify: `server/db/schema.ts`

- [ ] **Step 1: Write failing test for schema exports**

```typescript
// tests/schema.test.ts
import { describe, it, expect } from 'vitest'
import * as schema from '../server/db/schema'

describe('schema exports', () => {
  it('exports all required tables', () => {
    expect(schema.items).toBeDefined()
    expect(schema.suppliers).toBeDefined()
    expect(schema.customers).toBeDefined()
    expect(schema.purchaseOrders).toBeDefined()
    expect(schema.purchaseOrderLines).toBeDefined()
    expect(schema.salesOrders).toBeDefined()
    expect(schema.salesOrderLines).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run tests/schema.test.ts
```

Expected: FAIL — schema exports `{}`

- [ ] **Step 3: Write full schema**

```typescript
// server/db/schema.ts
import {
  pgTable, uuid, text, numeric, timestamp, date, index
} from 'drizzle-orm/pg-core'

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 4 }).notNull().default('0'),
  salePrice: numeric('sale_price', { precision: 12, scale: 4 }).notNull().default('0'),
  stockQty: numeric('stock_qty', { precision: 12, scale: 4 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  tin: text('tin'),
  vatRegNo: text('vat_reg_no'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  tin: text('tin'),
  vatRegNo: text('vat_reg_no'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  date: date('date').notNull(),
  voucherNo: text('voucher_no'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  vatAmount: numeric('vat_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  grandTotal: numeric('grand_total', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('purchase_orders_supplier_idx').on(t.supplierId)])

export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id),
  countryOfOrigin: text('country_of_origin'),
  brandName: text('brand_name'),
  qty: numeric('qty', { precision: 12, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 4 }).notNull(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
})

export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  date: date('date').notNull(),
  fsNo: text('fs_no').notNull(),
  mrcCode: text('mrc_code'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  vatAmount: numeric('vat_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  grandTotal: numeric('grand_total', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('sales_orders_customer_idx').on(t.customerId)])

export const salesOrderLines = pgTable('sales_order_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  salesOrderId: uuid('sales_order_id').notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id),
  countryOfOrigin: text('country_of_origin'),
  brandName: text('brand_name'),
  qty: numeric('qty', { precision: 12, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 4 }).notNull(),
  vatAmount: numeric('vat_amount', { precision: 12, scale: 4 }).notNull(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
})
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run tests/schema.test.ts
```

Expected: PASS

- [ ] **Step 5: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: Migration files created in `server/db/migrations/`, tables created in PostgreSQL. Verify with `psql $DATABASE_URL -c "\dt"` — should list all 7 tables.

- [ ] **Step 6: Commit**

```bash
git add server/db/schema.ts server/db/migrations/
git commit -m "feat: define database schema with drizzle orm"
```

---

## Task 4: Configure Better Auth

**Files:**
- Create: `server/auth.ts`, `server/routes/auth/[...].ts`, `server/middleware/auth.ts`

- [ ] **Step 1: Write failing test for auth config export**

```typescript
// tests/auth.test.ts
import { describe, it, expect } from 'vitest'

describe('auth config', () => {
  it('exports an auth instance', async () => {
    const mod = await import('../server/auth')
    expect(mod.auth).toBeDefined()
    expect(typeof mod.auth.handler).toBe('function')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run tests/auth.test.ts
```

Expected: FAIL — `Cannot find module '../server/auth'`

- [ ] **Step 3: Create Better Auth config**

```typescript
// server/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db/index'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
})
```

- [ ] **Step 4: Create catch-all route handler for Better Auth**

```typescript
// server/routes/auth/[...].ts
import { auth } from '~/server/auth'

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
```

- [ ] **Step 5: Create API route middleware to protect /api/***

```typescript
// server/middleware/auth.ts
import { auth } from '~/server/auth'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  // Only protect /api/* routes, skip /api/auth/*
  if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return

  const session = await auth.api.getSession({ headers: event.headers })
  if (!session) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  event.context.session = session
})
```

- [ ] **Step 6: Run Better Auth migration to create session/user tables**

```bash
npx better-auth migrate
```

Expected: Creates `user`, `session`, `account`, `verification` tables in PostgreSQL.

- [ ] **Step 7: Create the initial admin user (run once)**

```bash
node -e "
const { betterAuth } = require('better-auth')
// Use Better Auth's createUser via direct API call after server starts
console.log('Start server, then POST /api/auth/sign-up/email')
"
```

After server is running: 
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@katerina.com","password":"change-me","name":"Katerina Admin"}'
```

Expected: `{"user":{"id":"...","email":"admin@katerina.com",...}}`

- [ ] **Step 8: Run test — expect PASS**

```bash
npx vitest run tests/auth.test.ts
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add server/auth.ts server/routes/ server/middleware/
git commit -m "feat: configure better auth with email/password"
```

---

## Task 5: Design System — Tailwind + Fonts + CSS Tokens

**Files:**
- Create: `tailwind.config.ts`, `assets/css/main.css`
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Install Google Fonts (Libre Baskerville + DM Sans + JetBrains Mono)**

Add to `nuxt.config.ts`:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
  },
  typescript: { strict: true },
})
```

- [ ] **Step 2: Write CSS custom properties and Tailwind base styles**

```css
/* assets/css/main.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-bg:           oklch(98% 0.005 45);
    --color-surface:      oklch(96% 0.007 45);
    --color-surface-2:    oklch(93% 0.009 45);
    --color-border:       oklch(87% 0.010 45);
    --color-text:         oklch(11% 0.010 30);
    --color-text-muted:   oklch(42% 0.012 30);
    --color-red:          oklch(44% 0.195 25);
    --color-red-light:    oklch(94% 0.030 25);

    --font-display: 'Libre Baskerville', Georgia, serif;
    --font-ui:      'DM Sans', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', 'Courier New', monospace;
  }

  html {
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-ui);
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3 {
    font-family: var(--font-display);
  }

  /* Monospace for all numeric table cells */
  td.num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
}
```

- [ ] **Step 3: Configure Tailwind with design tokens**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.vue',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        surface2: 'var(--color-surface-2)',
        border:   'var(--color-border)',
        text:     'var(--color-text)',
        muted:    'var(--color-text-muted)',
        red:      'var(--color-red)',
        'red-light': 'var(--color-red-light)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        ui:      ['var(--font-ui)'],
        mono:    ['var(--font-mono)'],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '2px',
        lg: '2px',
      },
    },
  },
} satisfies Config
```

- [ ] **Step 4: Install shadcn-vue**

```bash
npx shadcn-vue@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

Then add base components:
```bash
npx shadcn-vue@latest add button input label table badge select dialog
```

- [ ] **Step 5: Override shadcn border-radius in `components.json`**

After init, open `components.json` and verify `"radius": 0.125` (= 2px equivalent). If not, update it.

- [ ] **Step 6: Verify fonts load**

```bash
npm run dev
```

Open `http://localhost:3000`. Open DevTools → Network tab → filter Fonts. Confirm `Libre+Baskerville` and `DM+Sans` loaded.

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts assets/ components.json nuxt.config.ts
git commit -m "feat: configure design system with katerina brand tokens"
```

---

## Task 6: App Layout Shell + Sidebar

**Files:**
- Create: `layouts/default.vue`, `components/AppSidebar.vue`, `app.vue`

- [ ] **Step 1: Update `app.vue` to use layouts**

```vue
<!-- app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 2: Create the default layout**

```vue
<!-- layouts/default.vue -->
<template>
  <div class="flex h-screen overflow-hidden bg-bg">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>
```

- [ ] **Step 3: Create AppSidebar**

```vue
<!-- components/AppSidebar.vue -->
<script setup lang="ts">
const route = useRoute()

const links = [
  { href: '/',           label: 'Dashboard',  icon: '▤' },
  { href: '/items',      label: 'Items',       icon: '◫' },
  { href: '/customers',  label: 'Customers',   icon: '◎' },
  { href: '/suppliers',  label: 'Suppliers',   icon: '◈' },
  { href: '/purchases',  label: 'Purchases',   icon: '↓' },
  { href: '/sales',      label: 'Sales',       icon: '↑' },
  { href: '/reports',    label: 'VAT Report',  icon: '≡' },
]

function isActive(href: string) {
  if (href === '/') return route.path === '/'
  return route.path.startsWith(href)
}
</script>

<template>
  <aside class="w-60 flex-shrink-0 flex flex-col border-r border-border bg-surface">
    <!-- Logo -->
    <div class="px-5 py-6 border-b border-border">
      <img src="~/assets/images/katerina-logo.png" alt="Katerina" class="h-8 w-auto" />
    </div>

    <!-- Nav -->
    <nav class="flex-1 py-4 px-3 space-y-0.5">
      <NuxtLink
        v-for="link in links"
        :key="link.href"
        :to="link.href"
        class="flex items-center gap-3 px-3 py-2 text-sm font-ui text-muted rounded-[2px] hover:bg-surface2 hover:text-text transition-colors relative"
        :class="{ 'bg-surface2 text-text': isActive(link.href) }"
      >
        <!-- Red left accent on active item -->
        <span
          v-if="isActive(link.href)"
          class="absolute left-0 top-1 bottom-1 w-0.5 bg-red rounded-[1px]"
        />
        <span class="text-base leading-none w-4 text-center">{{ link.icon }}</span>
        <span>{{ link.label }}</span>
      </NuxtLink>
    </nav>

    <!-- User / Logout -->
    <div class="px-3 py-4 border-t border-border">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-red hover:bg-red-light rounded-[2px] transition-colors"
        @click="$fetch('/api/auth/sign-out', { method: 'POST' }).then(() => navigateTo('/login'))"
      >
        <span class="text-base leading-none w-4 text-center">⊗</span>
        <span>Sign out</span>
      </button>
    </div>
  </aside>
</template>
```

- [ ] **Step 4: Copy the Katerina logo to assets**

```bash
cp "/Users/eyosiyasmekbib/Downloads/katerina-logo.png" assets/images/katerina-logo.png 2>/dev/null || \
  echo "Manually copy the logo PNG to assets/images/katerina-logo.png"
```

> If the logo file isn't a PNG, convert or reference the correct filename in `AppSidebar.vue`.

- [ ] **Step 5: Create a stub dashboard page**

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <div class="p-8">
    <h1 class="font-display text-2xl font-bold text-text">Dashboard</h1>
    <p class="mt-2 text-sm text-muted">Overview coming in Plan B.</p>
  </div>
</template>
```

- [ ] **Step 6: Start dev server and visually verify sidebar**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. Confirm:
- Sidebar visible with logo
- Links render
- Active state shows thin red left bar on "Dashboard"
- Fonts: headings use Libre Baskerville, nav uses DM Sans

- [ ] **Step 7: Commit**

```bash
git add layouts/ components/AppSidebar.vue pages/index.vue app.vue assets/images/
git commit -m "feat: add layout shell with katerina sidebar design"
```

---

## Task 7: Auth Page Middleware + Login Page

**Files:**
- Create: `middleware/auth.global.ts`, `pages/login.vue`, `composables/useUser.ts`

- [ ] **Step 1: Create global Nuxt page middleware**

```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { data } = await useFetch('/api/auth/get-session')
  if (!data.value?.user) {
    return navigateTo('/login')
  }
})
```

- [ ] **Step 2: Create useUser composable**

```typescript
// composables/useUser.ts
export const useUser = () => {
  return useState('user', () => null as null | { id: string; email: string; name: string })
}
```

- [ ] **Step 3: Create login page**

```vue
<!-- pages/login.vue -->
<script setup lang="ts">
definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo('/')
  } catch {
    error.value = 'Invalid email or password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <img
          src="~/assets/images/katerina-logo.png"
          alt="Katerina Barcode Solutions"
          class="h-10 w-auto mx-auto"
        />
      </div>

      <!-- Form card -->
      <div class="bg-surface border border-border p-8">
        <h1 class="font-display text-xl font-bold text-text mb-6">Sign in</h1>

        <form class="space-y-4" @submit.prevent="login">
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
            />
          </div>

          <p v-if="error" class="text-xs text-red">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50 mt-2"
          >
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>

      <p class="mt-4 text-center text-xs text-muted">
        Katerina Internal System
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Test login flow manually**

```bash
npm run dev
```

1. Navigate to `http://localhost:3000` — should redirect to `/login`
2. Enter `admin@katerina.com` / `change-me` (created in Task 4, Step 7)
3. Submit — should redirect to `/` (dashboard stub)
4. Navigate to `http://localhost:3000/login` while logged in — stays at `/login` (middleware only redirects unauthenticated users away from protected routes)

- [ ] **Step 5: Commit**

```bash
git add middleware/ pages/login.vue composables/
git commit -m "feat: add auth middleware and login page"
```

---

## Task 8: Ethiopian Date Utility

**Files:**
- Create: `server/utils/ec-dates.ts`, `tests/ec-dates.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/ec-dates.test.ts
import { describe, it, expect } from 'vitest'
import { toEthiopian, formatEcMonth } from '../server/utils/ec-dates'

describe('Ethiopian calendar utilities', () => {
  it('converts Gregorian 2026-02-08 to EC Yekatit 1, 2018', () => {
    const result = toEthiopian(new Date('2026-02-08'))
    expect(result.year).toBe(2018)
    expect(result.month).toBe(6)   // Yekatit is month 6 in ethiopian-date
    expect(result.day).toBe(1)
  })

  it('formats EC month range for VAT register header', () => {
    const label = formatEcMonth(2018, 6)
    expect(label).toBe('የካቲት 1-30, 2018 ዓ.ም')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/ec-dates.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement EC date utilities**

```typescript
// server/utils/ec-dates.ts
import EthiopianDate from 'ethiopian-date'

export interface EcDate {
  year: number
  month: number
  day: number
}

const EC_MONTH_NAMES: Record<number, string> = {
  1:  'መስከረም',
  2:  'ጥቅምት',
  3:  'ህዳር',
  4:  'ታህሳስ',
  5:  'ጥር',
  6:  'የካቲት',
  7:  'መጋቢት',
  8:  'ሚያዝያ',
  9:  'ግንቦት',
  10: 'ሰኔ',
  11: 'ሐምሌ',
  12: 'ነሐሴ',
  13: 'ጳጉሜ',
}

const EC_MONTH_DAYS: Record<number, number> = {
  1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30,
  7: 30, 8: 30, 9: 30, 10: 30, 11: 30, 12: 30,
  13: 5,
}

export function toEthiopian(date: Date): EcDate {
  const [year, month, day] = EthiopianDate.toEth(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )
  return { year, month, day }
}

export function formatEcDate(date: Date): string {
  const { year, month, day } = toEthiopian(date)
  return `${EC_MONTH_NAMES[month]} ${day}, ${year} ዓ.ም`
}

export function formatEcMonth(ecYear: number, ecMonth: number): string {
  const days = EC_MONTH_DAYS[ecMonth] ?? 30
  return `${EC_MONTH_NAMES[ecMonth]} 1-${days}, ${ecYear} ዓ.ም`
}

export function ecMonthDateRange(ecYear: number, ecMonth: number): { start: Date; end: Date } {
  const startGreg = EthiopianDate.toGreg(ecYear, ecMonth, 1)
  const days = EC_MONTH_DAYS[ecMonth] ?? 30
  const endGreg = EthiopianDate.toGreg(ecYear, ecMonth, days)
  return {
    start: new Date(startGreg[0], startGreg[1] - 1, startGreg[2]),
    end: new Date(endGreg[0], endGreg[1] - 1, endGreg[2]),
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/ec-dates.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/ec-dates.ts tests/ec-dates.test.ts
git commit -m "feat: add ethiopian calendar date utilities"
```

---

## Task 9: Inventory Utility (Weighted Average Cost)

**Files:**
- Create: `server/utils/inventory.ts`, `tests/inventory.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/inventory.test.ts
import { describe, it, expect } from 'vitest'
import { weightedAverageCost } from '../server/utils/inventory'

describe('weightedAverageCost', () => {
  it('returns new unit price when stock is zero', () => {
    expect(weightedAverageCost(0, 0, 10, 100)).toBeCloseTo(100)
  })

  it('calculates weighted average correctly', () => {
    // 10 units at 100, buying 5 more at 130
    // (10*100 + 5*130) / 15 = (1000 + 650) / 15 = 110
    expect(weightedAverageCost(10, 100, 5, 130)).toBeCloseTo(110)
  })

  it('handles fractional quantities', () => {
    expect(weightedAverageCost(2.5, 80, 2.5, 100)).toBeCloseTo(90)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run tests/inventory.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement utility**

```typescript
// server/utils/inventory.ts
export function weightedAverageCost(
  currentStock: number,
  currentCost: number,
  incomingQty: number,
  incomingCost: number
): number {
  const totalQty = currentStock + incomingQty
  if (totalQty === 0) return 0
  if (currentStock === 0) return incomingCost
  return (currentStock * currentCost + incomingQty * incomingCost) / totalQty
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run tests/inventory.test.ts
```

Expected: PASS

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/utils/inventory.ts tests/inventory.test.ts
git commit -m "feat: add weighted average cost inventory utility"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass. 0 failures.

- [ ] **Step 2: Run dev server end-to-end check**

```bash
npm run dev
```

Verify manually:
1. `http://localhost:3000` → redirects to `/login` ✓
2. Login with `admin@katerina.com` → redirects to `/` ✓
3. Dashboard stub renders with sidebar ✓
4. Sidebar active state: thin red bar on "Dashboard" ✓
5. Sign out button works → back to `/login` ✓
6. Fonts loaded: headings Libre Baskerville, body DM Sans ✓

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: plan-a complete — foundation verified"
```

---

## What's Next

Plan B implements all business features on top of this foundation:
- Items, Suppliers, Customers CRUD
- Purchase Orders (with inventory update)
- Sales Orders (with VAT calculation + inventory)
- Katerina VAT invoice print template (pixel-perfect)
- VAT Register report + ERCA Excel export
- Dashboard with monthly summary stats
