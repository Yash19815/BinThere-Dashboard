/**
 * ============================================================
 *  BinThere — Full IoT Pipeline v5.0
 *  ESP32 | Waste Classification System
 * ============================================================
 *  New in v5:
 *  [NEW] Web Serial Monitor — AsyncWebServer on port 80
 *        WebSocket at ws://<ESP32-IP>/ws streams all logs
 *        live to a browser terminal with color-coded tags,
 *        timestamps, auto-scroll and clear button.
 *
 *  Required libraries (install via Library Manager):
 *    - ESPAsyncWebServer  (by ESP32Async)
 *    - AsyncTCP           (by ESP32Async)
 * ============================================================
 *
 *  Pin Map:
 *    MICROWAVE (RCWL-0516) OUT  → GPIO 14
 *    MG995 Servo (Lid)     PWM  → GPIO 32
 *    SG90  Servo (Chute)   PWM  → GPIO 13
 *    Ultrasonic 1 DRY      TRIG → GPIO  5  | ECHO → GPIO 18
 *    Ultrasonic 2 WET      TRIG → GPIO 19  | ECHO → GPIO 21
 *    Soil Moisture         PWR  → GPIO 27  | AO   → GPIO 34
 *    VL53L0X TOF           SDA  → GPIO 25  | SCL  → GPIO 22
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include "esp_task_wdt.h"
#include <ESPAsyncWebServer.h>
#include <stdarg.h>

// ── WiFi & Server ─────────────────────────────────────────────────────────────
const char* WIFI_SSID      = "Airtel_vamika_2024";
const char* WIFI_PASSWORD  = "vamika_2024";
const char* SERVER_IP      = "192.168.1.8";
const int   SERVER_PORT    = 3001;
const char* DEVICE_API_KEY = "binthere-esp32-device-key-2026";

// ── Pin Definitions ───────────────────────────────────────────────────────────
#define MICROWAVE_PIN    14
#define MG995_PIN        32
#define SG90_PIN         13
#define TRIG_DRY          5
#define ECHO_DRY         18
#define TRIG_WET         19
#define ECHO_WET         21
#define SOIL_POWER_PIN   27
#define SOIL_AO_PIN      34
#define VL53_SDA         25
#define VL53_SCL         22

// ── Timing ────────────────────────────────────────────────────────────────────
#define MICROWAVE_POLL_MS       3000
#define ULTRASONIC_INTERVAL_MS  3000
#define WDT_TIMEOUT_S           30

// ── Microwave logic — RCWL-0516 outputs HIGH on detection ────────────────────
#define MOTION_ACTIVE    HIGH

// ── TOF Confidence Params ─────────────────────────────────────────────────────
#define TOF_REQUIRED_STREAK   3
#define TOF_TOLERANCE_CM      10.0f
#define TOF_TRIGGER_CM        150.0f

// ── Network Retry ─────────────────────────────────────────────────────────────
#define HTTP_MAX_RETRIES      3
#define HTTP_RETRY_DELAY_MS   1000

// ── Objects ───────────────────────────────────────────────────────────────────
Servo             mg995;
Servo             sg90;
Adafruit_VL53L0X  tof = Adafruit_VL53L0X();

AsyncWebServer    webSerial(80);
AsyncWebSocket    wsLog("/ws");

// ── State ─────────────────────────────────────────────────────────────────────
volatile bool     sg90Moving     = false;
int               mg995Angle     = 80;
int               sg90Angle      = 90;
bool              tofInitialized = false;
SemaphoreHandle_t wifiMutex;
SemaphoreHandle_t wsMutex;


// =============================================================================
//  WEB SERIAL MONITOR HTML
// =============================================================================

const char WS_MONITOR_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BinThere — Serial Monitor</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0d0d0d;color:#00ff41;font-family:'Courier New',monospace;height:100vh;display:flex;flex-direction:column;overflow:hidden}
  #hdr{background:#111;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1f1f1f;flex-shrink:0}
  #hdr-left{display:flex;align-items:center;gap:10px}
  #title{font-size:13px;font-weight:bold;letter-spacing:1px}
  #ip{font-size:11px;color:#444}
  #status{display:flex;align-items:center;gap:6px;font-size:11px;color:#666}
  #dot{width:7px;height:7px;border-radius:50%;background:#ff3333;transition:background .3s}
  #dot.on{background:#00ff41;box-shadow:0 0 6px #00ff41}
  #terminal{flex:1;overflow-y:auto;padding:10px 16px;font-size:12px;line-height:1.7}
  #terminal::-webkit-scrollbar{width:6px}
  #terminal::-webkit-scrollbar-track{background:#111}
  #terminal::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px}
  .ln{white-space:pre-wrap;word-break:break-all;padding:1px 0}
  .ts{color:#2a2a2a;margin-right:8px;user-select:none}
  #ftr{background:#111;padding:8px 16px;display:flex;align-items:center;gap:8px;border-top:1px solid #1f1f1f;flex-shrink:0}
  .btn{background:#161616;color:#00ff41;border:1px solid #2a2a2a;padding:5px 12px;cursor:pointer;font-family:monospace;font-size:11px;border-radius:3px;transition:all .2s}
  .btn:hover{background:#1e1e1e;border-color:#00ff41}
  #lc{color:#2a2a2a;font-size:11px;margin-left:auto}
</style>
</head>
<body>
<div id="hdr">
  <div id="hdr-left">
    <span id="title">&#x1F5D1; BINTHERE / SERIAL MONITOR</span>
    <span id="ip"></span>
  </div>
  <div id="status"><div id="dot"></div><span id="stxt">Disconnected</span></div>
</div>
<div id="terminal"></div>
<div id="ftr">
  <button class="btn" onclick="clearLog()">Clear</button>
  <button class="btn" id="asBtn" onclick="toggleAS()">Auto-scroll ON</button>
  <span id="lc">0 lines</span>
</div>
<script>
const term=document.getElementById('terminal');
const dot=document.getElementById('dot');
const stxt=document.getElementById('stxt');
const lc=document.getElementById('lc');
const asBtn=document.getElementById('asBtn');
document.getElementById('ip').textContent=location.host;
let autoScroll=true,lineCount=0,ws;

const COLORS={
  '[ERROR]':'#ff3333','[RETRY]':'#ff8800','[ULTRA]':'#00aaff',
  '[SOIL]':'#bb88ff','[MG995]':'#ff88aa','[SG90]':'#ffcc00',
  '[TOF]':'#00ffcc','[WiFi]':'#66ff66','[POST]':'#66ccff',
  '[BOOT]':'#888','[POWER]':'#888','[CYCLE]':'#aaa',
  'MICROWAVE':'#ffffff','[WSMON]':'#555555'
};

function colorFor(t){
  for(const[k,v] of Object.entries(COLORS)) if(t.includes(k)) return v;
  return '#00ff41';
}

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function appendLine(raw,forceColor){
  const lines=raw.split('\n');
  lines.forEach(text=>{
    if(!text.trim())return;
    const now=new Date();
    const ts=now.toTimeString().slice(0,8)+'.'+String(now.getMilliseconds()).padStart(3,'0');
    const div=document.createElement('div');
    div.className='ln';
    div.style.color=forceColor||colorFor(text);
    div.innerHTML='<span class="ts">'+ts+'</span>'+esc(text);
    term.appendChild(div);
    lineCount++;
    if(term.children.length>600)term.removeChild(term.firstChild);
  });
  lc.textContent=lineCount+' lines';
  if(autoScroll)term.scrollTop=term.scrollHeight;
}

function connect(){
  ws=new WebSocket('ws://'+location.host+'/ws');
  ws.onopen=()=>{
    dot.className='on';stxt.textContent='Connected';
    appendLine('[WSMON] Stream connected — waiting for logs...','#555');
  };
  ws.onclose=()=>{
    dot.className='';stxt.textContent='Reconnecting...';
    appendLine('[WSMON] Lost connection. Retrying in 3s...','#ff3333');
    setTimeout(connect,3000);
  };
  ws.onerror=()=>{ws.close()};
  ws.onmessage=e=>appendLine(e.data);
}

function clearLog(){term.innerHTML='';lineCount=0;lc.textContent='0 lines'}
function toggleAS(){autoScroll=!autoScroll;asBtn.textContent='Auto-scroll '+(autoScroll?'ON':'OFF')}
connect();
</script>
</body>
</html>
)rawliteral";


// =============================================================================
//  LOGGING — blog() / blogf() → Serial + WebSocket simultaneously
// =============================================================================

void blog(const char* msg) {
  Serial.print(msg);
  if (xSemaphoreTake(wsMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    if (wsLog.count() > 0) wsLog.textAll(msg);
    xSemaphoreGive(wsMutex);
  }
}

void blogf(const char* fmt, ...) {
  char buf[256];
  va_list args;
  va_start(args, fmt);
  vsnprintf(buf, sizeof(buf), fmt, args);
  va_end(args);
  blog(buf);
}


// =============================================================================
//  WEBSOCKET EVENT HANDLER
// =============================================================================

void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
               AwsEventType type, void* arg, uint8_t* data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    blogf("[WSMON] Client #%u connected from %s\n",
          client->id(), client->remoteIP().toString().c_str());
  } else if (type == WS_EVT_DISCONNECT) {
    blogf("[WSMON] Client #%u disconnected\n", client->id());
  } else if (type == WS_EVT_ERROR) {
    blogf("[WSMON] Client #%u error\n", client->id());
  }
}


// =============================================================================
//  SERVO HELPERS
// =============================================================================

void attachMG995() {
  mg995.setPeriodHertz(50);
  mg995.attach(MG995_PIN, 500, 2400);
  mg995.write(mg995Angle);
  delay(200);
}

void detachMG995() {
  mg995.detach();
  pinMode(MG995_PIN, OUTPUT);
  digitalWrite(MG995_PIN, LOW);
}

void attachSG90() {
  sg90.setPeriodHertz(50);
  sg90.attach(SG90_PIN, 500, 2400);
  sg90.write(sg90Angle);
  delay(200);
}

void detachSG90() {
  sg90.detach();
  pinMode(SG90_PIN, OUTPUT);
  digitalWrite(SG90_PIN, LOW);
}


// =============================================================================
//  WIFI
// =============================================================================

void reconnectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  blog("[WiFi] Reconnecting...\n");
  WiFi.reconnect();
  for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500); blog(".");
  }
  blog("\n");
}


// =============================================================================
//  DASHBOARD — retries up to HTTP_MAX_RETRIES on failure
// =============================================================================

void sendToServer(float distCm, const char* compartment) {
  if (xSemaphoreTake(wifiMutex, pdMS_TO_TICKS(3000)) != pdTRUE) return;

  reconnectWiFi();

  String url = String("http://") + SERVER_IP + ":" + SERVER_PORT
               + "/api/bins/1/measurement";

  String payload = "{\"raw_distance_cm\":" + String(distCm, 2)
                   + ",\"compartment\":\"" + compartment + "\"}";

  bool success = false;

  for (int attempt = 1; attempt <= HTTP_MAX_RETRIES && !success; attempt++) {
    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Key", DEVICE_API_KEY);
    http.setTimeout(5000);

    blogf("[POST] Attempt %d/%d → %s\n",
          attempt, HTTP_MAX_RETRIES, payload.c_str());

    int code = http.POST(payload);

    if (code == 200 || code == 201) {
      blogf("[POST] Success! HTTP %d\n", code);
      success = true;
    } else if (code > 0) {
      blogf("[POST] HTTP %d (unexpected)\n", code);
    } else {
      blogf("[ERROR] Attempt %d failed: %s\n",
            attempt, http.errorToString(code).c_str());
      if (attempt < HTTP_MAX_RETRIES) {
        blogf("[RETRY] Waiting %dms...\n", HTTP_RETRY_DELAY_MS);
        delay(HTTP_RETRY_DELAY_MS);
        reconnectWiFi();
      }
    }
    http.end();
  }

  if (!success) blog("[ERROR] All retries failed. Reading dropped.\n");

  xSemaphoreGive(wifiMutex);
}


// =============================================================================
//  ULTRASONIC SENSORS
// =============================================================================

float getDistance(int trig, int echo) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long dur = pulseIn(echo, HIGH, 30000);
  return (dur == 0) ? 0.0f : dur * 0.034f / 2.0f;
}

void ultrasonicTask(void* param) {
  esp_task_wdt_add(NULL);

  for (;;) {
    esp_task_wdt_reset();

    if (!sg90Moving) {
      float dry = getDistance(TRIG_DRY, ECHO_DRY);
      float wet = getDistance(TRIG_WET, ECHO_WET);
      blogf("[ULTRA] Dry: %.1f cm | Wet: %.1f cm\n", dry, wet);
      if (dry > 0) sendToServer(dry, "dry");
      if (wet > 0) sendToServer(wet, "wet");
    } else {
      blog("[ULTRA] SG90 moving — read skipped.\n");
    }

    vTaskDelay(pdMS_TO_TICKS(ULTRASONIC_INTERVAL_MS));
  }
}


// =============================================================================
//  VL53L0X TOF SENSOR — single-shot rangingTest() (Option A)
// =============================================================================

bool wakeTOF() {
  if (!tofInitialized) {
    Wire.begin(VL53_SDA, VL53_SCL);
    if (!tof.begin()) {
      blog("[TOF] Init failed!\n"); return false;
    }
    tof.configSensor(Adafruit_VL53L0X::VL53L0X_SENSE_LONG_RANGE);
    tof.setMeasurementTimingBudgetMicroSeconds(200000);
    tofInitialized = true;
  }
  blog("[TOF] Sensor ready.\n");
  return true;
}

void sleepTOF() {
  blog("[TOF] Sensor idle.\n");
}

float readTOFConfident() {
  VL53L0X_RangingMeasurementData_t measure;
  float lastReading = -1.0f;
  int   streak      = 0;
  int   maxAttempts = TOF_REQUIRED_STREAK * 3;

  for (int i = 0; i < maxAttempts && streak < TOF_REQUIRED_STREAK; i++) {

    tof.rangingTest(&measure, false);
    delay(50);

    if (measure.RangeStatus != 0) {
      blogf("[TOF] Bad RangeStatus: %d — streak reset.\n", measure.RangeStatus);
      streak = 0; lastReading = -1.0f;
      continue;
    }

    float cm = measure.RangeMilliMeter / 10.0f;

    if (lastReading < 0) {
      lastReading = cm; streak = 1;
    } else if (abs(cm - lastReading) <= TOF_TOLERANCE_CM) {
      lastReading = (lastReading + cm) / 2.0f; streak++;
    } else {
      blogf("[TOF] Jump %.1f → %.1f cm — streak reset.\n", lastReading, cm);
      lastReading = cm; streak = 1;
    }
  }

  if (streak >= TOF_REQUIRED_STREAK) {
    blogf("[TOF] Confident: %.1f cm (%d consecutive)\n", lastReading, streak);
    return lastReading;
  }

  blog("[TOF] Failed to get confident reading.\n");
  return -1.0f;
}


// =============================================================================
//  MG995 SERVO  (Lid)
// =============================================================================

void mg995MoveTo(int target) {
  if (target > mg995Angle) {
    for (int a = mg995Angle; a <= target; a++) {
      mg995.write(a); mg995Angle = a; delay(60);
    }
  } else if (target < mg995Angle) {
    for (int a = mg995Angle; a >= target; a--) {
      mg995.write(a); mg995Angle = a; delay(40);
    }
  }
}

void openAndCloseLid() {
  attachMG995();
  blog("[MG995] Opening lid (-70deg)...\n");
  mg995MoveTo(10);
  blog("[MG995] Lid open. Holding 5 seconds...\n");
  delay(5000);
  blog("[MG995] Closing lid (+70deg)...\n");
  mg995MoveTo(80);
  delay(300);
  detachMG995();
  blog("[MG995] Lid closed. Signal cut.\n");
}


// =============================================================================
//  SG90 SERVO  (Chute)
// =============================================================================

void sg90MoveTo(int target) {
  sg90Moving = true;
  if (target > sg90Angle) {
    for (int a = sg90Angle; a <= target; a++) {
      sg90.write(a); sg90Angle = a; delay(40);
    }
  } else if (target < sg90Angle) {
    for (int a = sg90Angle; a >= target; a--) {
      sg90.write(a); sg90Angle = a; delay(40);
    }
  }
  sg90Moving = false;
}

void routeWaste(bool isDry) {
  int target = isDry ? 150 : 40;
  blogf("[SG90] Attaching + routing → %s (%ddeg)\n",
        isDry ? "DRY" : "WET", target);
  attachSG90();
  sg90MoveTo(target);
  delay(1000);
  blog("[SG90] Returning to centre (90deg)...\n");
  sg90MoveTo(90);
  delay(300);
  detachSG90();
  blog("[SG90] Back at 90deg. Signal cut.\n");
}


// =============================================================================
//  SOIL MOISTURE
// =============================================================================

bool classifySoil() {
  blog("[SOIL] Powering sensor...\n");
  digitalWrite(SOIL_POWER_PIN, HIGH);
  delay(500);

  long sum = 0;
  for (int i = 0; i < 5; i++) {
    int v = analogRead(SOIL_AO_PIN);
    blogf("[SOIL] Reading %d/5: %d\n", i + 1, v);
    sum += v;
    delay(1000);
  }

  digitalWrite(SOIL_POWER_PIN, LOW);
  float avg = sum / 5.0f;
  bool  dry = avg > 3000;
  blogf("[SOIL] Avg: %.0f → %s\n", avg, dry ? "DRY" : "WET");
  return dry;
}


// =============================================================================
//  POWER MANAGEMENT
// =============================================================================

void standby() {
  digitalWrite(SOIL_POWER_PIN, LOW);
  sleepTOF();
  if (mg995.attached()) detachMG995();
  if (sg90.attached())  detachSG90();
  blog("[POWER] Standby — Microwave + Ultrasonics active.\n\n");
}


// =============================================================================
//  SETUP
// =============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  BinThere ESP32 v5.0 — Booting");
  Serial.println("========================================\n");

  esp_task_wdt_config_t wdt_config = {
    .timeout_ms     = WDT_TIMEOUT_S * 1000,
    .idle_core_mask = 0,
    .trigger_panic  = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);

  pinMode(MICROWAVE_PIN,  INPUT);
  pinMode(TRIG_DRY,       OUTPUT);
  pinMode(ECHO_DRY,       INPUT);
  pinMode(TRIG_WET,       OUTPUT);
  pinMode(ECHO_WET,       INPUT);
  pinMode(SOIL_POWER_PIN, OUTPUT);
  pinMode(MG995_PIN,      OUTPUT); digitalWrite(MG995_PIN, LOW);
  pinMode(SG90_PIN,       OUTPUT); digitalWrite(SG90_PIN,  LOW);
  digitalWrite(SOIL_POWER_PIN, LOW);

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  attachMG995(); delay(600); detachMG995();
  attachSG90();  delay(600); detachSG90();

  // ── WiFi ──────────────────────────────────────────────────────────────────
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println();
  Serial.printf("[WiFi] Connected — IP: %s\n", WiFi.localIP().toString().c_str());

  wifiMutex = xSemaphoreCreateMutex();
  wsMutex   = xSemaphoreCreateMutex();

  // ── Web Serial Monitor ────────────────────────────────────────────────────
  wsLog.onEvent(onWsEvent);
  webSerial.addHandler(&wsLog);

  webSerial.on("/", HTTP_GET, [](AsyncWebServerRequest* req) {
    req->send_P(200, "text/html", WS_MONITOR_HTML);
  });

  webSerial.begin();

  Serial.printf("[WSMON] Web Serial Monitor → http://%s/\n",
                WiFi.localIP().toString().c_str());

  // ── FreeRTOS Tasks ────────────────────────────────────────────────────────
  xTaskCreatePinnedToCore(
    ultrasonicTask, "UltrasonicTask",
    6144, NULL, 1, NULL, 0
  );

  standby();

  blogf("[BOOT] Ready. Open http://%s/ in your browser.\n\n",
        WiFi.localIP().toString().c_str());
}


// =============================================================================
//  MAIN LOOP (Core 1)
// =============================================================================

void loop() {
  esp_task_wdt_reset();
  wsLog.cleanupClients();

  if (digitalRead(MICROWAVE_PIN) != MOTION_ACTIVE) {
    delay(MICROWAVE_POLL_MS);
    return;
  }

  blog("[MICROWAVE] Motion detected!\n");

  if (!wakeTOF()) {
    blog("[TOF] Sensor unavailable. Back to standby.\n");
    delay(MICROWAVE_POLL_MS);
    return;
  }

  float tofDist = readTOFConfident();
  sleepTOF();

  if (tofDist < 0 || tofDist > TOF_TRIGGER_CM) {
    blog("[TOF] False alarm — standby.\n\n");
    delay(MICROWAVE_POLL_MS);
    return;
  }
  blogf("[TOF] Object at %.1f cm — starting cycle.\n", tofDist);

  esp_task_wdt_reset();

  openAndCloseLid();
  esp_task_wdt_reset();

  bool isDry = classifySoil();
  esp_task_wdt_reset();

  routeWaste(isDry);

  standby();
  blog("[CYCLE] Complete. Resuming motion monitoring...\n\n");
  esp_task_wdt_reset();
  delay(MICROWAVE_POLL_MS);
}