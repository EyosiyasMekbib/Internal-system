@echo off
title Katerina ERP - Setup
color 0A

:: ── Self-elevate to Admin ────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator access...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo  =============================================
echo    Katerina ERP - Downloading Installer...
echo  =============================================
echo.

:: ── Download + extract + run ─────────────────────────────────
powershell -ExecutionPolicy Bypass -Command ^
  "$url = 'https://github.com/EyosiyasMekbib/Internal-system/releases/latest/download/KaterinaERP-Setup.zip';" ^
  "$zip  = \"$env:TEMP\KaterinaERP-Setup.zip\";" ^
  "$dest = \"$env:TEMP\KaterinaERP-Setup\";" ^
  "Write-Host 'Downloading package...';" ^
  "Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing;" ^
  "Write-Host 'Extracting...';" ^
  "if (Test-Path $dest) { Remove-Item $dest -Recurse -Force };" ^
  "Expand-Archive -Path $zip -DestinationPath $dest -Force;" ^
  "Write-Host 'Launching installer...';" ^
  "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \"$dest\KaterinaERP-Setup\install.ps1\"' -Verb RunAs -Wait;"

echo.
echo  Done. You can close this window.
pause
