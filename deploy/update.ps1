# ============================================================
# Katerina ERP - Update Script
# Run as Administrator when shipping new features
# ============================================================

param(
    [string]$InstallDir = "C:\KaterinaERP",
    [string]$DBName     = "katerina",
    [string]$DBPassword = "katerina2026"
)

$ErrorActionPreference = "Stop"
$PGBin = "C:\Program Files\PostgreSQL\16\bin"

function Write-Step($n, $msg) { Write-Host "`n[$n/4] $msg" -ForegroundColor Cyan }
function Write-OK($msg)        { Write-Host "  OK: $msg"   -ForegroundColor Green }
function Fail($msg)            { Write-Host "`nERROR: $msg" -ForegroundColor Red; pause; exit 1 }

if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Fail "Run as Administrator."
}

Write-Host "`n  Katerina ERP — Update`n" -ForegroundColor Cyan

# ── 1. Stop app ──────────────────────────────────────────────
Write-Step 1 "Stopping app..."
pm2 stop katerina
Write-OK "App stopped"

# ── 2. Replace app files ─────────────────────────────────────
Write-Step 2 "Copying new app files..."

# Keep .env — only replace .output/ and migrations/
Remove-Item "$InstallDir\.output" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$PSScriptRoot\app\.output" "$InstallDir\.output" -Recurse -Force
if (Test-Path "$PSScriptRoot\app\migrations") {
    Copy-Item "$PSScriptRoot\app\migrations" "$InstallDir\migrations" -Recurse -Force
}
Write-OK "Files updated"

# ── 3. Apply new migrations ──────────────────────────────────
Write-Step 3 "Applying new migrations..."

$env:PGPASSWORD = $DBPassword
$migrationsDir  = "$InstallDir\migrations"

if (Test-Path $migrationsDir) {
    Get-ChildItem "$migrationsDir\*.sql" | Sort-Object Name | ForEach-Object {
        Write-Host "  Applying $($_.Name)..."
        & "$PGBin\psql.exe" -U postgres -d $DBName -f $_.FullName | Out-Null
    }
    Write-OK "Migrations applied"
} else {
    Write-Host "  No migrations — skipping." -ForegroundColor Gray
}

# ── 4. Restart app ───────────────────────────────────────────
Write-Step 4 "Restarting app..."
pm2 restart katerina
pm2 save
Write-OK "App restarted"

Write-Host "`n  Update complete. App running at http://localhost:3000`n" -ForegroundColor Green
Start-Process "http://localhost:3000"
pause
