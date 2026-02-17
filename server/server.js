import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set();

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");
  clients.add(ws);

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clients.delete(ws);
  });
});

// Broadcast data to all connected WebSocket clients
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) {
      // 1 = OPEN
      client.send(message);
    }
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    connectedClients: clients.size,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint to receive sensor data from ESP32
app.post("/api/sensor-data", (req, res) => {
  const { distance } = req.body;

  // Validate incoming data
  if (distance === undefined || distance === null) {
    return res.status(400).json({
      status: "error",
      message: "Distance value is required",
    });
  }

  if (typeof distance !== "number" || distance < 0) {
    return res.status(400).json({
      status: "error",
      message: "Distance must be a positive number",
    });
  }

  console.log(`Received sensor data: ${distance} cm`);

  // Prepare data with timestamp
  const sensorData = {
    distance: distance,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to all connected WebSocket clients
  broadcastToClients(sensorData);

  // Respond to ESP32
  res.json({
    status: "success",
    message: "Data received and broadcasted",
    data: sensorData,
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
});
