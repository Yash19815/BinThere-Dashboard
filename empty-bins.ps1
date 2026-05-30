param (
    [int[]]$BinIds
)

# =============================================================================
# empty-bins.ps1 - BinThere Dual-Compartment Emptying Script
# =============================================================================
#
# PURPOSE:
#   Simulates the emptying event for specific Bin IDs by sending 0% fill level
#   telemetry to the backend for both Dry and Wet compartments.
#
# USAGE:
#   .\empty-bins.ps1
#   .\empty-bins.ps1 -BinIds 1,2,3
#
# PREREQUISITES:
#   - Backend server must be running (npm run dev from project root)
#   - Server must be reachable at http://localhost:3001
#
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$activeBinIds = @()

if (($BinIds) -and ($BinIds.Count -gt 0)) {
    foreach ($id in $BinIds) {
        if ($id -match "^\d+$") {
            $activeBinIds += [int]$id
        }
    }
}

if ($activeBinIds.Count -eq 0) {
    # Ask how many dustbins the user wants to empty
    $countInput = ""
    while ($true) {
        $countInput = Read-Host "How many dustbins do you want to empty?"
        if (($countInput -match "^\d+$") -and ([int]$countInput -gt 0)) {
            $binCount = [int]$countInput
            break
        }
        Write-Warning "[WARN] Please enter a valid positive number."
    }

    # Ask for the IDs of the dustbins in respective manner
    for ($i = 1; $i -le $binCount; $i++) {
        $binIdInput = ""
        while ($true) {
            $binIdInput = Read-Host "Enter ID for Dustbin #$i"
            if ($binIdInput -match "^\d+$") {
                $activeBinIds += [int]$binIdInput
                break
            }
            Write-Warning "[WARN] Please enter a numeric ID only."
        }
    }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvPath = Join-Path $ScriptDir "server\.env"
$DeviceKey = ""

if ((Test-Path $EnvPath)) {
    $EnvLines = Get-Content $EnvPath
    foreach ($line in $EnvLines) {
        if (($line -match "^DEVICE_API_KEY=(.*)$")) {
            $DeviceKey = $matches[1].Trim("`"'")
        }
    }
}

# Build the display string of active bins
$binsDisplay = ($activeBinIds | ForEach-Object { '#{0:D3}' -f $_ }) -join ", "
Write-Host "Emptying Dustbins: $binsDisplay..." -ForegroundColor Green
if (-not $DeviceKey) { Write-Warning "[WARN] No DEVICE_API_KEY found in server/.env. Auth might fail." }

$headers = @{}
if ($DeviceKey) {
    $headers["X-Device-Key"] = $DeviceKey
}

foreach ($BinId in $activeBinIds) {
    $baseUrl = "http://localhost:3001/api/bins/$BinId/measurement"

    try {
        # Dry Compartment (0% fill level)
        $bodyDry = @{ compartment = "dry"; fill_level_percent = 0 } | ConvertTo-Json -Depth 10
        $resDry = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $bodyDry -ContentType "application/json" -Headers $headers

        # Wet Compartment (0% fill level)
        $bodyWet = @{ compartment = "wet"; fill_level_percent = 0 } | ConvertTo-Json -Depth 10
        $resWet = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $bodyWet -ContentType "application/json" -Headers $headers

        $formattedBinId = '{0:D3}' -f $BinId
        if (($resDry) -and ($resWet)) {
            Write-Host "[+] Bin #$formattedBinId has been successfully emptied (Dry: 0%, Wet: 0%)" -ForegroundColor Green
        }
    }
    catch {
        Write-Warning "[!] Failed to empty Bin #${BinId}: $_"
    }
}

Write-Host "`n[OK] Done." -ForegroundColor Green
