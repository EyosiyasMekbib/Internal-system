// server/db/schema.ts
import {
  pgTable, uuid, text, numeric, timestamp, date, index, boolean
} from 'drizzle-orm/pg-core'

// ── better-auth tables ─────────────────────────────────────────────────────

export const authUser = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const authSession = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
})

export const authAccount = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const authVerification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// ── app tables ────────────────────────────────────────────────────────────

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 4 }).notNull().default('0'),
  salePrice: numeric('sale_price', { precision: 12, scale: 4 }).notNull().default('0'),
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
  costPrice: numeric('cost_price', { precision: 12, scale: 4 }).notNull().default('0'),
  qty: numeric('qty', { precision: 12, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 4 }).notNull(),
  vatAmount: numeric('vat_amount', { precision: 12, scale: 4 }).notNull(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
