# Katerina ERP — Manual Setup Guide

Use this guide if the automated installer (`install.ps1`) fails or you prefer to set up manually.

---

## Prerequisites

- Windows 10 or 11 (64-bit)
- Administrator access
- Internet connection for downloads

---

## Step 1 — Install Node.js

1. Download Node.js v22.13.1 from:
   `https://nodejs.org/dist/v22.13.1/node-v22.13.1-x64.msi`
2. Run the installer, accept all defaults.
3. Open a **new** Command Prompt and verify:
   ```
   node --version
   npm --version
   ```

---

## Step 2 — Install PostgreSQL 16

1. Download the installer from:
   `https://get.enterprisedb.com/postgresql/postgresql-16.6-1-windows-x64.exe`
2. Run the installer.
   - Installation directory: `C:\Program Files\PostgreSQL\16`
   - Data directory: `C:\Program Files\PostgreSQL\16\data`
   - Password for the `postgres` superuser: `katerina2026`
   - Port: `5432`
   - Locale: default
3. Finish the installer. **Do not launch Stack Builder.**

---

## Step 3 — Create the Database and User

Open **Command Prompt as Administrator** and run:

```cmd
set PGPASSWORD=katerina2026
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

Inside the psql prompt run these commands one at a time:

```sql
CREATE USER katerina WITH PASSWORD 'katerina2026';
CREATE DATABASE katerina OWNER katerina;
\q
```

---

## Step 4 — Copy Application Files

1. Create the install directory:
   ```cmd
   mkdir C:\KaterinaERP
   ```
2. From the release package, copy the contents of the `app\` folder into `C:\KaterinaERP`:
   ```
   C:\KaterinaERP\
     .output\
     migrations\
   ```

---

## Step 5 — Write the .env File

Create `C:\KaterinaERP\.env` with a plain text editor (Notepad). Paste exactly:

```
DATABASE_URL=postgresql://katerina:katerina2026@localhost:5432/katerina
BETTER_AUTH_SECRET=<replace-with-a-random-32-char-string>
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=production
PORT=3000
```

To generate a random secret, run this in PowerShell:

```powershell
-join ((65..90 + 97..122 + 48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
```

Copy the output and paste it as the value of `BETTER_AUTH_SECRET`.

> **Important:** Save the file as plain UTF-8 with no BOM. In Notepad, choose
> File → Save As → Encoding: UTF-8 (not "UTF-8 with BOM").

---

## Step 6 — Apply Database Migrations

In **Command Prompt as Administrator**:

```cmd
set PGPASSWORD=katerina2026
for %f in (C:\KaterinaERP\migrations\*.sql) do (
    echo Applying %f...
    "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d katerina -f "%f"
)
```

---

## Step 7 — Install PM2

In **Command Prompt as Administrator**:

```cmd
npm install -g pm2 pm2-windows-startup
```

---

## Step 8 — Start the App and Register it as a Service

In **Command Prompt as Administrator**:

```cmd
pm2 start C:\KaterinaERP\.output\server\index.mjs --name katerina --cwd C:\KaterinaERP --env production
pm2-startup install
pm2 save
```

The app now starts automatically on every boot.

Verify it is running:

```cmd
pm2 status
```

Open a browser and go to: `http://localhost:3000`

---

## Step 9 — Create a Desktop Shortcut (optional)

1. Right-click the desktop → New → Shortcut.
2. Location: `http://localhost:3000`
3. Name: `Katerina ERP`

Or create a `.url` file at
`C:\Users\Public\Desktop\Katerina ERP.url` with this content:

```
[InternetShortcut]
URL=http://localhost:3000
IconIndex=0
```

---

## Updating the App

1. Stop the app:
   ```cmd
   pm2 stop katerina
   ```
2. Delete the old output:
   ```cmd
   rmdir /s /q C:\KaterinaERP\.output
   ```
3. Copy the new `app\.output` folder into `C:\KaterinaERP\.output`.
4. Apply any new migrations (same command as Step 6).
5. Restart:
   ```cmd
   pm2 restart katerina
   pm2 save
   ```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `psql` not found | Add `C:\Program Files\PostgreSQL\16\bin` to your PATH |
| `node` not found after install | Reboot, then reopen Command Prompt |
| App not accessible on port 3000 | Run `pm2 logs katerina` and check for startup errors |
| Database connection refused | Verify PostgreSQL service is running in Services (`services.msc`) |
| `.env` variables not loading | Ensure the file has no BOM and is saved as plain UTF-8 |
| PM2 not starting on boot | Re-run `pm2-startup install` and `pm2 save` as Administrator |
