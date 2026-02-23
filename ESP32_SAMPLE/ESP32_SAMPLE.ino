/**
 * @file    ESP32_SAMPLE.ino
 * @brief   BinThere – ESP32 Dual-Sensor Firmware
 *
 * Reads two HC-SR04 ultrasonic sensors every READ_INTERVAL milliseconds and
 * POSTs their raw distance readings to the BinThere backend server over WiFi.
 *
 * Wiring (default pins, configurable in config.h):
 *  Sensor 1 (Dry Waste)  TRIG → GPIO 5   ECHO → GPIO 18
 *  Sensor 2 (Wet Waste)  TRIG → GPIO 19  ECHO → GPIO 21
 *
 * Setup:
 *  1. Copy ESP32_SAMPLE/config.h.example → config.h
 *  2. Fill in WIFI_SSID, WIFI_PASSWORD, and SERVER_IP (your PC's local IP)
 *  3. Flash to an ESP32 via Arduino IDE (board: "ESP32 Dev Module")
 *
 * JSON payload sent per cycle:
 *  { "sensor1": <cm>, "sensor2": <cm> }
 *
 * The server maps:
 *  sensor1 → Dry Waste compartment
 *  sensor2 → Wet Waste compartment
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"  // WiFi credentials + pin / interval constants

/**
 * @brief Reused variable for storing HC-SR04 echo pulse duration.
 * Declared at file scope to avoid stack allocation inside getDistance().
 */
long duration;

/**
 * @brief Arduino setup — runs once on power-on or after a reset.
 *
 * Initialises:
 *  - Serial monitor at 115200 baud for debug output
 *  - TRIG pins as OUTPUT, ECHO pins as INPUT for both sensors
 *  - WiFi connection (blocks until connected, printing dots to Serial)
 */
void setup() {
  Serial.begin(115200);
  
  // Initialize sensor 1 pins (Dry Waste compartment)
  pinMode(TRIG_PIN_1, OUTPUT);
  pinMode(ECHO_PIN_1, INPUT);

  // Initialize sensor 2 pins (Wet Waste compartment)
  pinMode(TRIG_PIN_2, OUTPUT);
  pinMode(ECHO_PIN_2, INPUT);
  
  // Connect to WiFi — blocks until association succeeds
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Server URL: ");
  Serial.println(SERVER_URL);
}

/**
 * @brief Arduino main loop — runs repeatedly after setup().
 *
 * Each iteration:
 *  1. Reads HC-SR04 distance from both sensors
 *  2. Prints readings to Serial for debugging
 *  3. POSTs the payload to SERVER_URL (if WiFi is connected)
 *  4. Sleeps for READ_INTERVAL ms before the next cycle
 *
 * If WiFi drops, attempts a reconnect and skips the HTTP POST for that cycle.
 */
void loop() {
  // Read raw distance from both HC-SR04 sensors (cm)
  float distance1 = getDistance(TRIG_PIN_1, ECHO_PIN_1);
  float distance2 = getDistance(TRIG_PIN_2, ECHO_PIN_2);
  
  // Debug output to Serial Monitor (Tools → Serial Monitor, 115200 baud)
  Serial.print("Sensor 1: ");
  Serial.print(distance1);
  Serial.print(" cm  |  Sensor 2: ");
  Serial.print(distance2);
  Serial.println(" cm");
  
  // Send data to server only while connected; attempt reconnect if dropped
  if (WiFi.status() == WL_CONNECTED) {
    sendDataToServer(distance1, distance2);
  } else {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
  
  // Wait before the next reading cycle (READ_INTERVAL defined in config.h)
  delay(READ_INTERVAL);
}

/**
 * @brief Measures the distance to the nearest object using an HC-SR04 sensor.
 *
 * Timing sequence (per HC-SR04 datasheet):
 *  1. Pull TRIG LOW for 2 µs to reset
 *  2. Pulse TRIG HIGH for 10 µs to trigger a burst of 8 × 40 kHz ultrasonic pulses
 *  3. Measure high-pulse width on ECHO pin → round-trip travel time in microseconds
 *  4. Convert: distance (cm) = duration × 0.034 / 2
 *     (0.034 cm/µs = speed of sound; ÷2 because the signal travels to the object and back)
 *
 * @param trigPin  GPIO pin connected to HC-SR04 TRIG
 * @param echoPin  GPIO pin connected to HC-SR04 ECHO
 * @return Distance in centimetres, or 0 if the reading is out of valid range (2–400 cm).
 */
float getDistance(int trigPin, int echoPin) {
  // Step 1: reset any residual pulse on TRIG
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  
  // Step 2: send 10 µs trigger pulse
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  // Step 3: measure echo duration
  long dur = pulseIn(echoPin, HIGH);

  // Step 4: convert time to distance
  float dist = dur * 0.034 / 2;
  
  // Ignore readings outside the HC-SR04's reliable range (2–400 cm)
  if (dist > 400 || dist < 2) return 0;
  
  return dist;
}

/**
 * @brief Sends a dual-sensor payload to the BinThere backend via HTTP POST.
 *
 * Builds a JSON string manually (avoids pulling in ArduinoJson for a simple
 * two-field payload) and posts it to SERVER_URL defined in config.h.
 *
 * Payload format:
 *  { "sensor1": <dist1>, "sensor2": <dist2> }
 *
 * The server maps sensor1 → "dry" compartment, sensor2 → "wet" compartment,
 * computes the fill percentage, stores the measurement, and broadcasts a
 * WebSocket update to all connected dashboard clients.
 *
 * HTTP response code is printed to Serial for diagnostics.
 * Negative codes indicate a connection error (server unreachable, wrong IP, etc.)
 *
 * @param dist1  Raw distance from Sensor 1 in centimetres (Dry Waste)
 * @param dist2  Raw distance from Sensor 2 in centimetres (Wet Waste)
 */
void sendDataToServer(float dist1, float dist2) {
  HTTPClient http;
  
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Build the JSON payload as a String (no external library needed)
  String jsonPayload = "{\"sensor1\":" + String(dist1) + ",\"sensor2\":" + String(dist2) + "}";
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    // Positive code = server responded (200 = success, 4xx/5xx = server-side error)
    Serial.print("HTTP Response: ");
    Serial.println(httpResponseCode);
  } else {
    // Negative code = client-side connection failure (check SERVER_IP in config.h)
    Serial.print("POST Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
