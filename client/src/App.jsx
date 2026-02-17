import { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket server
    const connectWebSocket = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:3001";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Connected to WebSocket server");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received sensor data:", data);

        setSensorData(data);

        // Add to history (keep last 10 readings)
        setHistory((prev) => {
          const newHistory = [data, ...prev].slice(0, 10);
          return newHistory;
        });
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);

        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    // Cleanup on component unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Determine distance status for color coding
  const getDistanceStatus = (distance) => {
    if (distance > 50) return "far";
    if (distance > 20) return "medium";
    return "close";
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>ESP32 Ultrasonic Sensor Monitor</h1>
        <div
          className={`connection-status ${isConnected ? "connected" : "disconnected"}`}
        >
          <span className="status-dot"></span>
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </header>

      <main className="main-content">
        <div className="sensor-display">
          {sensorData ? (
            <>
              <div
                className={`distance-card ${getDistanceStatus(sensorData.distance)}`}
              >
                <h2>Current Distance</h2>
                <div className="distance-value">
                  {sensorData.distance.toFixed(2)}
                  <span className="unit">cm</span>
                </div>
                <div className="timestamp">
                  Last updated: {formatTime(sensorData.timestamp)}
                </div>
              </div>

              <div className="visual-indicator">
                <div className="indicator-bar-container">
                  <div
                    className={`indicator-bar ${getDistanceStatus(sensorData.distance)}`}
                    style={{
                      width: `${Math.min((sensorData.distance / 100) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="range-labels">
                  <span>0cm</span>
                  <span>50cm</span>
                  <span>100cm+</span>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data">
              <p>Waiting for sensor data...</p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="history-section">
            <h3>Recent Readings</h3>
            <div className="history-list">
              {history.map((reading, index) => (
                <div key={index} className="history-item">
                  <span
                    className={`history-badge ${getDistanceStatus(reading.distance)}`}
                  >
                    {reading.distance.toFixed(2)} cm
                  </span>
                  <span className="history-time">
                    {formatTime(reading.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
