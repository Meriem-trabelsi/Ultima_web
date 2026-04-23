param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

function Resolve-NgrokPath {
  if ($env:NGROK_BIN -and (Test-Path $env:NGROK_BIN)) {
    return $env:NGROK_BIN
  }

  $knownPath = "C:\Tools\ngrok\ngrok.exe"
  if (Test-Path $knownPath) {
    return $knownPath
  }

  $cmd = Get-Command ngrok -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  throw "ngrok executable not found. Set NGROK_BIN or install ngrok."
}

function Get-NgrokPublicUrl {
  try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
  } catch {
    return $null
  }

  if (-not $response.tunnels) { return $null }
  $httpsTunnel = $response.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1
  if (-not $httpsTunnel) { return $null }
  return [string]$httpsTunnel.public_url
}

function Set-EnvValue([string]$filePath, [string]$key, [string]$value) {
  $lines = @()
  if (Test-Path $filePath) {
    $lines = Get-Content $filePath
  }

  $updated = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\Q$key\E=") {
      $lines[$i] = "$key=$value"
      $updated = $true
      break
    }
  }

  if (-not $updated) {
    $lines += "$key=$value"
  }

  Set-Content -Path $filePath -Value $lines
}

$ngrokPath = Resolve-NgrokPath

$publicUrl = Get-NgrokPublicUrl
if (-not $publicUrl) {
  Write-Host "Starting ngrok with $ngrokPath on port $Port ..."
  Start-Process -FilePath $ngrokPath -ArgumentList @("http", "$Port") -WindowStyle Minimized
}

for ($attempt = 0; $attempt -lt 40; $attempt++) {
  Start-Sleep -Milliseconds 500
  $publicUrl = Get-NgrokPublicUrl
  if ($publicUrl) { break }
}

if (-not $publicUrl) {
  throw "Could not fetch ngrok public URL from http://127.0.0.1:4040/api/tunnels"
}

$envFile = Join-Path $projectRoot ".env"
Set-EnvValue -filePath $envFile -key "PUBLIC_WEB_BASE_URL" -value $publicUrl

Write-Host "PUBLIC_WEB_BASE_URL updated to: $publicUrl"
Write-Host "Starting Docker stack..."

docker compose up -d --build
