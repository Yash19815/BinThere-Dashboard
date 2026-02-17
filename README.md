# ESP32 Ultrasonic Sensor Monitor

A real-time web application that displays ultrasonic sensor readings from an ESP32 WiFi module. Features a modern React frontend with WebSocket-based live updates.

## Features

- 🔄 Real-time sensor data updates via WebSocket
- 🎨 Modern, premium UI with glassmorphism effects
- 📊 Visual distance indicator with color-coded alerts
  - 🟢 Green: Far (> 50cm)
  - 🟡 Yellow: Medium (20-50cm)
  - 🔴 Red: Close (< 20cm)
- 📜 Reading history (last 10 measurements)
- 🔌 Auto-reconnection on connection loss
- 📱 Responsive design

## Project Structure

```
demo-ultrasonic/
├── server/          # Node.js backend
│   ├── server.js    # Express + WebSocket server
│   └── package.json
├── client/          # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main component
│   │   ├── App.css      # Styling
│   │   └── main.jsx     # Entry point
│   ├── package.json
│   └── vite.config.js
└── ESP32_SAMPLE.ino # Arduino code for ESP32
```

## Setup Instructions

### 1. Backend Setup

```bash
cd server
npm install
npm start
```

Server will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd client
npm install
npm run dev
```

React app will run on `http://localhost:5173`

### 3. ESP32 Setup

1. Open `ESP32_SAMPLE.ino` in Arduino IDE
2. Install required libraries:
   - WiFi (built-in)
   - HTTPClient (built-in)
3. Update the following in the code:
   - `YOUR_WIFI_SSID` - Your WiFi network name
   - `YOUR_WIFI_PASSWORD` - Your WiFi password
   - `192.168.1.100` - Your computer's IP address
4. Connect pins:
   - **Trig Pin** → GPIO 5
   - **Echo Pin** → GPIO 18
   - **VCC** → 5V
   - **GND** → GND
5. Upload code to ESP32

## API Endpoints

### POST /api/sensor-data

Receives sensor data from ESP32.

**Request:**

```json
{
  "distance": 25.5
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Data received and broadcasted",
  "data": {
    "distance": 25.5,
    "timestamp": "2026-02-16T15:54:30.123Z"
  }
}
```

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "connectedClients": 1,
  "timestamp": "2026-02-16T15:54:30.123Z"
}
```

## WebSocket

**URL:** `ws://localhost:3001`

**Message Format:**

```json
{
  "distance": 25.5,
  "timestamp": "2026-02-16T15:54:30.123Z"
}
```

## Testing Without ESP32

You can test the application using curl:

```bash
curl -X POST http://localhost:3001/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"distance": 30}'
```

## Troubleshooting

1. **Backend not receiving data:**
   - Check ESP32 serial monitor for connection errors
   - Verify IP address is correct
   - Ensure firewall allows port 3001

2. **Frontend not updating:**
   - Open browser console to check WebSocket connection
   - Verify backend server is running
   - Check for CORS errors

3. **ESP32 WiFi issues:**
   - Verify WiFi credentials
   - Check signal strength
   - Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)

## Technologies Used

- **Backend:** Node.js, Express, WebSocket (ws)
- **Frontend:** React, Vite
- **Hardware:** ESP32, HC-SR04 Ultrasonic Sensor
- **Communication:** HTTP POST, WebSocket

## License

MIT
