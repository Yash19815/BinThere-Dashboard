# =============================================================================
# test-sensor.ps1 — BinThere Dual-Sensor Simulation Script
# =============================================================================
#
# PURPOSE:
#   Simulates an ESP32 sending random HC-SR04 distance readings to the backend
#   without requiring physical hardware. Useful for development and testing the
#   real-time dashboard updates.
#
# USAGE:
#   .\test-sensor.ps1
#   (Press Ctrl+C to stop)
#
# PREREQUISITES:
#   - Backend server must be running (npm run dev from project root)
#   - Server must be reachable at http://localhost:3001
#
# WHAT IT DOES:
#   Every 2 seconds, sends a POST to /api/sensor-data with:
#     sensor1 — random distance 5–50 cm  → mapped to Dry Waste compartment
#     sensor2 — random distance 5–50 cm  → mapped to Wet Waste compartment
#
#   The server converts distance to fill % using:
#     fill % = ((max_height_cm - distance_cm) / max_height_cm) × 100
#   With max_height_cm = 50:
#     distance=5  cm → ~90 % full   (near sensor = nearly full)
#     distance=50 cm →   0 % full   (far from sensor = empty)
#
# OUTPUT:
#   [HH:mm:ss] Dry: <dist> cm (<fill>%)  |  Wet: <dist> cm (<fill>%)
#
# =============================================================================

# Backend API endpoint for legacy dual-sensor data
$baseUrl = "http://localhost:3001/api/sensor-data"

Write-Host "Starting dual-sensor simulation for Dustbin #001..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

while ($true) {
    # Generate random distances in the HC-SR04 reliable range (5–50 cm)
    # The fractional part (.99 * random) adds sub-centimetre precision
    $sensor1 = [math]::Round((Get-Random -Minimum 5 -Maximum 50) + (Get-Random) * 0.99, 2)
    $sensor2 = [math]::Round((Get-Random -Minimum 5 -Maximum 50) + (Get-Random) * 0.99, 2)

    # Build the JSON payload matching the /api/sensor-data contract
    $body = @{ sensor1 = $sensor1; sensor2 = $sensor2 } | ConvertTo-Json

    try {
        # POST to the server; response includes computed fill percentages
        $response  = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $body -ContentType "application/json"
        $ts        = Get-Date -Format "HH:mm:ss"
        $dryFill   = $response.data.dry.fill_level_percent
        $wetFill   = $response.data.wet.fill_level_percent

        # Print a timestamped summary line
        Write-Host "[$ts] Dry: ${sensor1} cm ($dryFill%)  |  Wet: ${sensor2} cm ($wetFill%)" -ForegroundColor Cyan
    }
    catch {
        # Server unreachable or returned an error — display the reason and keep retrying
        Write-Host "Error: $_" -ForegroundColor Red
    }

    # Wait before the next simulated reading cycle
    Start-Sleep -Seconds 2
}
