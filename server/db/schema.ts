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
