@echo off
setlocal enabledelayedexpansion

echo 🧹 Cleaning...
if exist dist rmdir /s /q dist
if exist dupr-js-client-*.tgz del dupr-js-client-*.tgz

echo 🔨 Building...
npm run build

echo ✅ Validating...
npm run typecheck
npm pack --dry-run

echo 📦 Packing...
npm pack

for /f %%i in ('npm pkg get version --json ^| findstr "version"') do (
  set "version=%%i"
  set "version=!version:\"\"=!"
  set "version=!version:\"=!"
  set "version=!version:version: =!"
)
echo ✅ SUCCESS: dupr-js-client-%version%.tgz
pause