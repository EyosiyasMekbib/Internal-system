# Katerina ERP

Internal ERP system for Ethiopian businesses — inventory management, purchase orders, sales orders, and VAT reporting.

Built with Nuxt 4, PostgreSQL, Drizzle ORM, and better-auth.

## Features

- Inventory management with weighted-average cost tracking
- Purchase and sales order management
- VAT reporting with Ethiopian calendar support
- Payroll tax calculations
- Session-based authentication

## Requirements

- Node.js 22+
- PostgreSQL 16+
- Docker (optional, for local dev)

## Setup

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Start PostgreSQL (Docker)
docker compose up -d

# Apply migrations
npx drizzle-kit migrate

# Start dev server
npm run dev
```

## Environment Variables

```
DATABASE_URL=postgresql://katerina:katerina_dev@localhost:5432/katerina
BETTER_AUTH_SECRET=<random 32-char string>
BETTER_AUTH_URL=http://localhost:3000
```

## Deployment (Windows)

See `deploy/` for the Windows installer scripts. Run `deploy/build-package.sh` on macOS/Linux to produce a `KaterinaERP-Setup.zip`, then distribute `deploy/launch.bat` to the client.
