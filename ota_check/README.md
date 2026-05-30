# BinThere OTA Updates (Over-The-Air)

This directory contains resources and documentation for flashing, verifying, and managing Over-The-Air (OTA) firmware updates for the BinThere ESP32 device using the ElegantOTA framework.

## How to Flash OTA Updates

OTA updates allow you to push new C++ firmware to the ESP32 over Wi-Fi without needing a physical USB connection.

1. Ensure the ESP32 is powered on and connected to your local Wi-Fi network.
2. Identify the ESP32's IP address (can be found via your router, the Web Serial Monitor, or the initial USB serial output).
3. Open a web browser and navigate to the update endpoint: `http://<ESP32-IP>/update`
4. Use the web interface to select and upload your newly compiled `.bin` firmware file.

## Security & Authentication

> [!CAUTION]
> **Secure Your Endpoints:** By default, the development firmware runs without authentication. For production or untrusted environments, you MUST secure the `/update` endpoint using HTTP Basic Auth to prevent unauthorized users from flashing malicious firmware or bricking the device.

- Enable authentication in `ESP32_Code/binthere_final_pipeline.ino` by calling:
  ```cpp
  ElegantOTA.begin(&webSerial);
  ElegantOTA.setAuth("your_username", "your_password"); // Enforce Basic Auth
  ```
- **Recommended Credentials**: Do not leave credentials at defaults (e.g. `admin`/`admin123`). Ensure you define unique, strong values before deployment.

## Included Files

- `ota_confirm.ino`: A minimal fallback sketch used to test basic OTA functionality if the main pipeline fails.
- Reference headers: `config.h` and `webpage.h` serving as examples for standalone OTA implementation.
