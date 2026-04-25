param (
    [int]$BinId = 1
)

# =============================================================================
# test-sensor.ps1 - BinThere Dual-Sensor Simulation Script
# =============================================================================
#
# PURPOSE:
#   Simulates an ESP32 sending random HC-SR04 distance readings to the backend
#   without requiring physical hardware. Useful for development and testing the
#   real-time dashboard updates.
#
# USAGE:
#   .\test-sensor.ps1 [-BinId <id>]
#   (Press Ctrl+C to stop)
#
# PREREQUISITES:
#   - Backend server must be running (npm run dev from project root)
#   - Server must be reachable at http://localhost:3001
#
# WHAT IT DOES:
#   Every 3 seconds, sends a POST to /api/bins/<id>/measurement with:
#     raw_distance_cm (random 0-25 cm) -> mapped to Dry Waste
#     raw_distance_cm (random 0-25 cm) -> mapped to Wet Waste
#
#   The server converts distance to fill % using:
#     fill % = ((max_height_cm - distance_cm) / max_height_cm) * 100
#   With max_height_cm = 25:
#     distance=0  cm -> 100 % full   (Sensor touching waste = Full)
#     distance=25 cm -> 0 % full     (Sensor sees bin floor = Empty)
#
# OUTPUT:
#   [HH:mm:ss] Dry: <dist> cm (<fill>%)  |  Wet: <dist> cm (<fill>%)
#
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

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

# Backend API endpoint for measurement data
$baseUrl = "http://localhost:3001/api/bins/$BinId/measurement"

Write-Host "Starting dual-sensor simulation for Dustbin #$( '{0:D3}' -f $BinId )..." -ForegroundColor Green
if (-not $DeviceKey) { Write-Warning "[WARN] No DEVICE_API_KEY found in server/.env. Auth might fail." }
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

while ($true) {
    # Generate random distances in the 0-25 cm range (bin height = 25cm)
    # 0 cm = sensor touching waste = 100% full
    # 25 cm = sensor sees bin floor = 0% full (empty)
    $sensor1 = [math]::Round((Get-Random -Minimum 0.0 -Maximum 25.0), 2)
    $sensor2 = [math]::Round((Get-Random -Minimum 0.0 -Maximum 25.0), 2)

    $headers = @{}
    if ($DeviceKey) {
        $headers["X-Device-Key"] = $DeviceKey
    }

    try {
        # Dry Compartment
        $bodyDry = @{ compartment = "dry"; raw_distance_cm = $sensor1 } | ConvertTo-Json -Depth 10
        $resDry = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $bodyDry -ContentType "application/json" -Headers $headers

        # Wet Compartment
        $bodyWet = @{ compartment = "wet"; raw_distance_cm = $sensor2 } | ConvertTo-Json -Depth 10
        $resWet = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $bodyWet -ContentType "application/json" -Headers $headers

        $ts = Get-Date -Format "HH:mm:ss"
        if (($resDry) -and ($resWet)) {
            $dryFill = $resDry.data.fill_level_percent
            $wetFill = $resWet.data.fill_level_percent
            # Print a timestamped summary line
            Write-Host "[$ts] Dry: ${sensor1} cm ($dryFill%)  |  Wet: ${sensor2} cm ($wetFill%)" -ForegroundColor Cyan
        }
    }
    catch {
        # Server unreachable or returned an error - display the reason and keep retrying
        Write-Warning "Error: $_"
    }

    # Wait before the next simulated reading cycle
    Start-Sleep -Seconds 3
}
