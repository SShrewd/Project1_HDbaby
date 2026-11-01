$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$outputDirectory = Join-Path $projectRoot 'output'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$archive = Join-Path $outputDirectory 'HDbaby-source.zip'
tar.exe -a -c -f $archive --exclude=node_modules --exclude=dist --exclude=.env --exclude=*.tsbuildinfo --exclude=uploads/*.webp frontend backend scripts docs tests package.json package-lock.json README.md .env.example .gitignore .prettierrc.json .prettierignore docker-compose.yml eslint.config.js playwright.config.ts
if ($LASTEXITCODE -ne 0) { throw 'Source archive creation failed.' }
Write-Output "Created $archive (excludes .env, .runtime and node_modules)."
