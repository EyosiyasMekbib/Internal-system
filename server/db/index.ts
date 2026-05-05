// server/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'path'
import * as schema from './schema'

const dbPath = process.env.DATABASE_PATH ?? './katerina.db'
const sqlite = new Database(dbPath)

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

// Run migrations synchronously on startup (safe: idempotent)
const migrationsFolder = process.env.MIGRATIONS_PATH
  ?? join(process.cwd(), 'server/db/migrations')

migrate(db, { migrationsFolder })
