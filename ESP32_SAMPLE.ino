#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"  // Include configuration file

// Variables
long duration;
float distance;

void setup() {
  Serial.begin(115200);
  
  // Initialize ultrasonic sensor pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Connect to WiFi
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

void loop() {
  // Take ultrasonic measurement
  distance = getDistance();
  
  // Print to serial monitor
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  
  // Send data to server
  if (WiFi.status() == WL_CONNECTED) {
    sendDataToServer(distance);
  } else {
    Serial.println("WiFi disconnected. Reconnecting...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
  
  // Wait before next reading
  delay(READ_INTERVAL);
}

float getDistance() {
  // Clear the trigPin
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Trigger the sensor
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Read the echoPin
  duration = pulseIn(ECHO_PIN, HIGH);
  
  // Calculate distance in cm
  float dist = duration * 0.034 / 2;
  
  // Return 0 if reading is invalid
  if (dist > 400 || dist < 2) {
    return 0;
  }
  
  return dist;
}

void sendDataToServer(float dist) {
  HTTPClient http;
  
  // Begin HTTP connection
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  String jsonPayload = "{\"distance\":" + String(dist) + "}";
  
  // Send POST request
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);
  } else {
    Serial.print("Error on sending POST: ");
    Serial.println(httpResponseCode);
  }
  
  // Close connection
  http.end();
}
