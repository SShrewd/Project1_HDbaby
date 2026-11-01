$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
if (!(Test-Path -LiteralPath 'node_modules')) { npm.cmd install; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
if (!(Test-Path -LiteralPath 'backend/.env')) {
  npm.cmd run setup
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} elseif ((Get-Content -LiteralPath 'backend/.env' -Raw) -match '127\.0\.0\.1:3307/hdbaby_db') {
  node scripts/local-mysql.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
npm.cmd run dev
