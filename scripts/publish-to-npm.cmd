@echo off
setlocal enabledelayedexpansion

@REM echo 🔍 Checking if logged into npm...
@REM npm whoami >nul 2>&1
@REM if errorlevel 1 (
@REM   echo ❌ Not logged into npm. Run: npm login
@REM   goto :end
@REM )

echo 🧹 Cleaning...
if exist dist rmdir /s /q dist
if exist *.tgz del *.tgz

echo 🔨 Building...
npm run build

echo ✅ Validating...
npm run lint
npm run test
npm run typecheck
npm pack --dry-run

echo 📋 Current version: %npm_package_version%

echo ❓ Continue with npm publish %npm_package_version%? [y/N]
set /p confirm=
if /i not "!confirm!"=="y" (
  echo ⚠️  Aborted.
  goto :end
)

echo 🚀 Publishing to npm...
npm publish --access public --provenance

if errorlevel 1 (
  echo ❌ Publish failed.
  goto :end
)

echo ✅ SUCCESS: Published dupr-js-client@%npm_package_version% 🎉
echo 📖 View on npm: https://www.npmjs.com/package/dupr-js-client
echo 🌐 GitHub: https://github.com/sunnytambi/dupr-js-client

:end
pause