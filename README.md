# BinThere — Smart Dustbin Monitor

A real-time web dashboard for monitoring dustbin fill levels via ESP32 ultrasonic sensors. Each bin has two compartments (**Dry Waste** and **Wet Waste**), each measured by a separate HC-SR04 sensor.

## ✨ Features

- **Secure login** — JWT-based authentication with bcrypt password hashing
- **Real-time fill levels** — WebSocket push on every sensor reading
- **Dual-compartment monitoring** — Dry 🌫 and Wet 💧 waste, each with vertical fill indicator
- **Average fill bar** — Card footer shows average fill of both compartments
- **Color-coded status** — Green → Yellow → Orange → Red as bin fills
- **Notification alerts** — Bell badge when any compartment exceeds 80%
- **History modal** — Click a bin card to see a chart + table of last 50 readings
- **Analytics chart** — Daily fill-cycle trend graph (7 / 14 / 30 / 90 day range)
- **Excel export** — Downloads Bins, Measurements, and Fill Cycles in IST with optional date-range filtering
- **Toast notifications** — Login, logout, and error feedback via react-hot-toast
- **Dark mode** — Toggle in the profile dropdown, persisted across sessions
- **Persistent storage** — SQLite DB stores all measurements and fill cycle events
- **Auto-reconnect** — WebSocket reconnects automatically on network loss
- **No hardware required to test** — included PowerShell simulation script

---

## 📁 Project Structure

```
demo-ultrasonic/
├── package.json              ← Root: run both servers with one command
│
├── server/                   ← Node.js backend
│   ├── server.js             ← Express + SQLite + WebSocket + Auth
│   ├── bins.db               ← SQLite database (auto-created)
│   ├── package.json
│   └── .env                  ← PORT, DB_PATH, JWT_SECRET, …
│
├── client/                   ← React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx           ← Dashboard (Header, BinCard, Analytics, Modal…)
│   │   ├── App.css           ← Design system (light + dark themes)
│   │   ├── AuthContext.jsx   ← Global auth state (login / logout / rehydration)
│   │   └── LoginPage.jsx     ← Full-screen login form
│   ├── package.json
│   └── .env                  ← VITE_WS_URL, VITE_API_URL
│
├── ESP32_SAMPLE/             ← Arduino sketch
│   ├── ESP32_SAMPLE.ino      ← Reads 2 sensors, POSTs to server
│   ├── config.h              ← WiFi credentials + pin config (create from .example)
│   └── config.h.example      ← Template
│
├── test-sensor.ps1           ← Simulates ESP32 sensor data (Windows)
└── .gitignore
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+
- **Arduino IDE** (only for uploading to ESP32)

### 1 — Install all dependencies

```bash
npm run install:all
```

### 2 — Start both servers together

```bash
npm run dev
```

This starts:

- **Backend** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`

Then open **http://localhost:5173** and log in with the default credentials:

| Username | Password   |
| -------- | ---------- |
| `admin`  | `admin123` |

> The default admin account is created automatically on first startup if no users exist.

---

## ⚙️ Configuration

### Backend (`server/.env`)

```env
PORT=3001
DB_PATH=./bins.db

# Auth
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d

# Default admin account (auto-created on first startup)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

> **⚠️ Before deploying:** Set a strong `JWT_SECRET` and change `DEFAULT_ADMIN_PASSWORD`.

### Frontend (`client/.env`)

```env
VITE_WS_URL=ws://localhost:3001
VITE_API_URL=http://localhost:3001
```

> When deploying, replace `localhost` with your server's IP/hostname in both files.

---

## 🔌 ESP32 Wiring

Two HC-SR04 sensors — one per compartment:

| Sensor        | Trig Pin | Echo Pin |
| ------------- | -------- | -------- |
| Dry Waste (1) | GPIO 5   | GPIO 18  |
| Wet Waste (2) | GPIO 19  | GPIO 21  |

VCC → 5V, GND → GND for both sensors.

### ESP32 Configuration

```bash
# Copy the template
copy ESP32_SAMPLE\config.h.example ESP32_SAMPLE\config.h
```

Edit `config.h`:

```cpp
#define WIFI_SSID     "Your_WiFi_Name"
#define WIFI_PASSWORD "Your_WiFi_Password"
#define SERVER_IP     "192.168.1.11"   // your PC's IP — run: ipconfig
#define SERVER_PORT   "3001"
```

> **Finding your IP:** Run `ipconfig` in Command Prompt and look for the **IPv4 Address** under your WiFi adapter.

Upload `ESP32_SAMPLE.ino` via Arduino IDE. The ESP32 posts to `/api/sensor-data` every 10 seconds.

> **Upload tip:** If upload fails, hold the **BOOT** button on the ESP32 while the IDE shows `Connecting...`

> **Note:** The ESP32 posts directly to the backend without authentication. Sensor data is always stored even when no user is logged in to the dashboard.

---

## 🌐 API Reference

### Authentication (public — no token required)

| Method | Path                 | Description                      |
| ------ | -------------------- | -------------------------------- |
| `POST` | `/api/auth/login`    | Login → returns JWT token        |
| `POST` | `/api/auth/register` | Register new user → returns JWT  |
| `GET`  | `/api/auth/me`       | Verify token, return user info   |
| `POST` | `/api/sensor-data`   | ESP32 sensor readings (no token) |

### Protected endpoints (require `Authorization: Bearer <token>`)

| Method | Path                        | Description                       |
| ------ | --------------------------- | --------------------------------- |
| `GET`  | `/api/health`               | Health check                      |
| `GET`  | `/api/bins`                 | All bins with current fill levels |
| `GET`  | `/api/bins/:id`             | Single bin + last 50 measurements |
| `GET`  | `/api/bins/:id/analytics`   | Daily fill-cycle chart data       |
| `POST` | `/api/bins/:id/measurement` | New measurement (REST)            |
| `GET`  | `/api/export/excel`         | Excel export (IST timestamps + optional date range) |

### ESP32 → POST `/api/sensor-data`

```json
{ "sensor1": 12.5, "sensor2": 38.0 }
```

`sensor1` → Dry Waste, `sensor2` → Wet Waste. Fill level is computed from `max_height_cm` (default 50 cm).

### Excel Export (`GET /api/export/excel`)

Downloads an `.xlsx` file containing:

- `Bins` — bin metadata
- `Measurements` — sensor readings (with `Date (IST)` + `Time (IST)` in 24-hour format)
- `Fill Cycles` — fill/empty events (timestamps displayed in IST)

Optional query params (interpreted as IST dates):

- `from=YYYY-MM-DD` — start date (inclusive)
- `to=YYYY-MM-DD` — end date (inclusive, through `23:59:59`)

### WebSocket Events (`ws://localhost:3001`)

```json
{ "type": "state",  "bin": { ... } }   // sent on new connection
{ "type": "update", "bin": { ... } }   // sent on every new measurement
```

---

## 🧪 Testing Without Hardware

```powershell
# Simulates both sensors sending random readings every 2 seconds
.\test-sensor.ps1
```

Or manually via PowerShell:

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/sensor-data -Method POST `
  -Body '{"sensor1": 10, "sensor2": 40}' -ContentType "application/json"
```

---

## 🔧 Troubleshooting

| Problem                        | Fix                                                                      |
| ------------------------------ | ------------------------------------------------------------------------ |
| Port 3001 already in use       | `netstat -ano \| findstr :3001` → `taskkill /PID <pid> /F`               |
| WebSocket disconnected         | Backend not running. Run `npm run dev` from root                         |
| Bin card shows "No data yet"   | Send a test reading with `test-sensor.ps1`                               |
| Analytics chart not showing    | Make sure you're logged in — chart data requires authentication          |
| ESP32 `POST Error: -1`         | `SERVER_IP` in `config.h` doesn't match your PC's current IPv4 address   |
| ESP32 won't upload             | Hold **BOOT** during `Connecting...` phase in Arduino IDE                |
| WiFi won't connect             | Use 2.4 GHz — ESP32 doesn't support 5 GHz networks                       |
| Login fails with correct creds | Restart the server — new packages (bcryptjs/jsonwebtoken) must be loaded |

---

## 🗄️ Database Management

The SQLite database (`server/bins.db`) stores all measurements, fill cycle events, and user accounts.

### Clear fill cycle history (analytics chart only)

```powershell
# Run from the server/ directory
node -e "import('better-sqlite3').then(({default:DB})=>{const db=new DB('./bins.db');const r=db.prepare('DELETE FROM fill_cycles').run();console.log('Deleted',r.changes,'fill cycle rows');db.close()})"
```

### Clear all raw measurements + fill cycles

```powershell
node -e "import('better-sqlite3').then(({default:DB})=>{const db=new DB('./bins.db');db.prepare('DELETE FROM measurements').run();db.prepare('DELETE FROM fill_cycles').run();console.log('All data cleared');db.close()})"
```

> **Note:** Restart the server after clearing so the in-memory fill-state cache resets.

---

## 🛠️ Tech Stack

| Layer       | Technology                                   |
| ----------- | -------------------------------------------- |
| Frontend    | React 18, Vite, CSS Variables                |
| Auth (UI)   | AuthContext (React Context), react-hot-toast |
| Backend     | Node.js, Express, ws (WebSocket)             |
| Auth (API)  | jsonwebtoken (JWT), bcryptjs                 |
| Database    | SQLite via `better-sqlite3`                  |
| Hardware    | ESP32, HC-SR04 ultrasonic sensors            |
| Dev tooling | concurrently, nodemon                        |

---

## License

MIT
