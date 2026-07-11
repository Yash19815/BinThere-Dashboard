# BinThere - Utility Scripts

This directory houses cross-platform automation and configuration utilities used during the initialization, development, and packaging lifecycle of the BinThere project.

## Automation Tools

### `setup.cjs`

The primary initialization script. It automates the environment setup process across the entire monorepo, ensuring developers can clone and run the dashboard with zero manual configuration.

**Workflow:**

1. **Bootstrap Dependencies**: Executes `npm install` concurrently in the monorepo root, frontend `client/`, and backend `server/` subdirectories.
2. **Backend Environment Provisioning**: Copies `server/.env.example` to `server/.env` (if not already present), automatically generating a secure, randomized cryptographically-strong `JWT_SECRET` and a secure `DEVICE_API_KEY`.
3. **Frontend Environment Provisioning**: Copies `client/.env.example` to `client/.env`. By default, this uses `localhost`. 
4. **Hardware Config Provisioning**: Copies `ESP32_Code/config.h.example` to `ESP32_Code/config.h` and `ota_check/config.h.example` to `ota_check/config.h`, automatically synchronizing and injecting the same secure `DEVICE_API_KEY` generated for the backend.
5. **Python Environment Provisioning**: Copies `python_scripts/.env.example` to `python_scripts/.env` (injecting the secure `DEVICE_API_KEY`), creates a Python virtual environment (`.venv`), and installs all requirements from `requirements.txt` if Python is detected on the system.
6. **Network Exposure (Optional)**: If you intend to connect remote ESP32s or mobile devices, you should manually update `VITE_API_URL` and `VITE_WS_URL` in `client/.env` (and `config.h` for the ESP32) with your machine's active local network IP address (e.g., `192.168.1.5`).

**Usage:**

This script is automatically executed when you run the global configuration command from the project root:

```bash
npm run configure
```

