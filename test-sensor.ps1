# Test script to simulate ESP32 sensor data
# Run this script to send random distance readings to the server

$baseUrl = "http://localhost:3001/api/sensor-data"

Write-Host "Starting sensor simulation..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    # Generate random distance between 5 and 100 cm
    $distance = Get-Random -Minimum 5 -Maximum 100
    
    # Create JSON payload
    $body = @{
        distance = $distance
    } | ConvertTo-Json
    
    try {
        # Send POST request
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $body -ContentType "application/json"
        
        # Display status
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] Sent: $distance cm - Status: $($response.status)" -ForegroundColor Cyan
    }
    catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    
    # Wait 2 seconds before next reading
    Start-Sleep -Seconds 2
}
