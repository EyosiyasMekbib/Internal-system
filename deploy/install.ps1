# ============================================================
# Katerina ERP - One-Time Installer
# Run as Administrator: Right-click -> "Run with PowerShell"
# ============================================================

param(
    [string]$InstallDir = "C:\KaterinaERP",
    [string]$DBPassword = "katerina2026",
    [string]$DBName     = "katerina",
    [string]$DBUser     = "katerina",
    [int]$AppPort       = 3000
)

$ErrorActionPreference = "Stop"
$PGDir     = "C:\Program Files\PostgreSQL\16"
$PGBin     = "$PGDir\bin"
$NodeVer   = "22.13.1"
$NodeUrl   = "https://nodejs.org/dist/v$NodeVer/node-v$NodeVer-x64.msi"
$PGUrl     = "https://get.enterprisedb.com/postgresql/postgresql-16.6-1-windows-x64.exe"

function Write-Step($n, $msg) { Write-Host "`n[$n/9] $msg" -ForegroundColor Cyan }
function Write-OK($msg)        { Write-Host "  OK: $msg"   -ForegroundColor Green }
function Write-Skip($msg)      { Write-Host "  --: $msg (already installed, skipping)" -ForegroundColor Gray }
function Fail($msg)            { Write-Host "`nERROR: $msg" -ForegroundColor Red; pause; exit 1 }

# ── Admin check ──────────────────────────────────────────────
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Fail "Script must be run as Administrator. Right-click the file -> Run with PowerShell as Admin."
}

Write-Host @"

  ╔═══════════════════════════════════╗
  ║   Katerina ERP — Setup Wizard     ║
  ╚═══════════════════════════════════╝

"@ -ForegroundColor Cyan

# ── 1. Node.js ───────────────────────────────────────────────
Write-Step 1 "Installing Node.js $NodeVer..."

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Skip "Node.js"
} else {
    $msi = "$env:TEMP\node-installer.msi"
    Write-Host "  Downloading Node.js..." -NoNewline
    Invoke-WebRequest -Uri $NodeUrl -OutFile $msi -UseBasicParsing
    Write-Host " done."
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait
    # Reload PATH so node is available immediately
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-OK "Node.js installed"
}

# ── 2. PostgreSQL 16 ─────────────────────────────────────────
Write-Step 2 "Installing PostgreSQL 16..."

if (Test-Path "$PGBin\psql.exe") {
    Write-Skip "PostgreSQL"
} else {
    $pgExe = "$env:TEMP\pg-installer.exe"
    Write-Host "  Downloading PostgreSQL (~300 MB)..." -NoNewline
    Invoke-WebRequest -Uri $PGUrl -OutFile $pgExe -UseBasicParsing
    Write-Host " done."
    Start-Process $pgExe -ArgumentList (
        "--mode unattended",
        "--superpassword `"$DBPassword`"",
        "--servicename postgresql-16",
        "--servicepassword `"$DBPassword`"",
        "--datadir `"$PGDir\data`"",
        "--serverport 5432"
    ) -Wait
    Write-OK "PostgreSQL installed"
}

$env:Path += ";$PGBin"
$env:PGPASSWORD = $DBPassword

# ── 3. Database + user ───────────────────────────────────────
Write-Step 3 "Setting up database..."

# Create role (ignore error if already exists)
& "$PGBin\psql.exe" -U postgres -c "DO `$`$ BEGIN CREATE USER $DBUser WITH PASSWORD '$DBPassword'; EXCEPTION WHEN duplicate_object THEN NULL; END `$`$;" | Out-Null
# Create database (ignore error if already exists)
& "$PGBin\psql.exe" -U postgres -c "SELECT 1 FROM pg_database WHERE datname='$DBName'" | ForEach-Object {
    if ($_ -notmatch "1 row") {
        & "$PGBin\psql.exe" -U postgres -c "CREATE DATABASE $DBName OWNER $DBUser;" | Out-Null
    }
}
Write-OK "Database ready"

# ── 4. Copy app files ────────────────────────────────────────
Write-Step 4 "Installing application to $InstallDir..."

if (!(Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir | Out-Null }
Copy-Item -Path "$PSScriptRoot\app\*" -Destination $InstallDir -Recurse -Force
Write-OK "App files copied"

# ── 5. Write .env ────────────────────────────────────────────
Write-Step 5 "Writing configuration..."

$secret = -join ((65..90 + 97..122 + 48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
@"
DATABASE_URL=postgresql://${DBUser}:${DBPassword}@localhost:5432/${DBName}
BETTER_AUTH_SECRET=$secret
BETTER_AUTH_URL=http://localhost:${AppPort}
NODE_ENV=production
PORT=$AppPort
"@ | Set-Content "$InstallDir\.env" -Encoding UTF8
Write-OK ".env created"

# ── 6. Run migrations ────────────────────────────────────────
Write-Step 6 "Applying database migrations..."

$migrationsDir = "$InstallDir\migrations"
if (Test-Path $migrationsDir) {
    Get-ChildItem "$migrationsDir\*.sql" | Sort-Object Name | ForEach-Object {
        Write-Host "  Applying $($_.Name)..."
        & "$PGBin\psql.exe" -U postgres -d $DBName -f $_.FullName | Out-Null
    }
    Write-OK "Migrations applied"
} else {
    Write-Host "  No migrations folder found — skipping." -ForegroundColor Yellow
}

# ── 7. Install PM2 ───────────────────────────────────────────
Write-Step 7 "Installing PM2 process manager..."

npm install -g pm2 pm2-windows-startup 2>&1 | Out-Null
Write-OK "PM2 installed"

# ── 8. Register as Windows service ───────────────────────────
Write-Step 8 "Registering Katerina as a Windows service..."

# Stop existing instance if any
pm2 delete katerina 2>$null

pm2 start "$InstallDir\.output\server\index.mjs" `
    --name "katerina" `
    --env production `
    -- --dotenv "$InstallDir\.env"

pm2-startup install
pm2 save
Write-OK "Windows service registered — starts automatically on boot"

# ── 9. Desktop shortcut ──────────────────────────────────────
Write-Step 9 "Creating desktop shortcut..."

$shortcutPath = [Environment]::GetFolderPath("CommonDesktopDirectory") + "\Katerina ERP.url"
@"
[InternetShortcut]
URL=http://localhost:$AppPort
IconIndex=0
"@ | Set-Content $shortcutPath -Encoding UTF8
Write-OK "Shortcut on desktop for all users"

# ── Done ─────────────────────────────────────────────────────
Write-Host @"

  ╔═══════════════════════════════════════════════╗
  ║   Installation complete!                      ║
  ║                                               ║
  ║   App:  http://localhost:$AppPort                  ║
  ║   DB:   localhost:5432 / $DBName            ║
  ║                                               ║
  ║   Double-click "Katerina ERP" on the desktop  ║
  ║   to open the app in your browser.            ║
  ╚═══════════════════════════════════════════════╝
"@ -ForegroundColor Green

Start-Process "http://localhost:$AppPort"
pause
