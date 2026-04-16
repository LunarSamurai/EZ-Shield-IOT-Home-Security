// ============================================================
// EZShield Door Unit — Arduino + ESP-01 (AT Commands)
// ============================================================
// Single sketch that runs on the Arduino. Reads sensors and
// controls the ESP-01 module via AT commands over SoftwareSerial
// to POST sensor data over WiFi to your API.
//
// Each door/entry point gets its own copy of this sketch.
// Just change the CONFIGURATION section for each unit.
//
// Wiring (ESP-01 to Arduino):
//   Arduino Pin 2  <--  ESP-01 TX
//   Arduino Pin 3  -->  ESP-01 RX  (voltage divider: 5V->3.3V)
//   3.3V regulator -->  ESP-01 VCC + CH_PD (EN)
//   Arduino GND    -->  ESP-01 GND
//   ESP-01 GPIO0   -->  3.3V (run mode) or leave floating
// ============================================================

#include <SoftwareSerial.h>

// ============================================================
// CONFIGURATION — Change this for each door unit
// ============================================================

// ---- WiFi ----
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";

// ---- API ----
// Your Vercel app domain (no trailing slash, no https://)
const char* API_HOST       = "your-app.vercel.app";
const int   API_PORT       = 443;  // 443 for HTTPS

// Must match PI_API_KEY in your webapp .env.local
const char* API_KEY        = "ez7f3a9b1d4e8c2f6a0b5d9e3f7c1a4b8d2e6f0a3c7b9d1e5f8a2c4b6d0e9f";

// ---- This Door Unit ----
// Each unit needs a unique ZONE_ID across your whole system
#define ZONE_ID           1
#define ZONE_NAME         "Front Door"
#define DEVICE_NAME       "Door-Unit-1"

// ---- Sensor Pins ----
// Hall effect sensor (magnetic reed switch)
#define HALL_PIN          4       // Reed switch between this pin and GND

// Ultrasonic sensor (optional — set to -1 to disable)
#define ULTRA_TRIG_PIN    8       // HC-SR04 TRIG pin (-1 = no ultrasonic)
#define ULTRA_ECHO_PIN    9       // HC-SR04 ECHO pin
#define ULTRA_ZONE_ID     101     // Separate zone ID for ultrasonic on this unit
#define ULTRA_ZONE_NAME   "Front Door Motion"
#define ULTRA_THRESHOLD   30      // Alert if distance < this (cm)

// ---- ESP-01 Serial ----
#define ESP_RX  2   // Arduino pin 2 → ESP TX
#define ESP_TX  3   // Arduino pin 3 → ESP RX (use voltage divider!)
#define ESP_BAUD 9600

// ---- Timing ----
#define HALL_POLL_MS       200
#define ULTRA_POLL_MS      500
#define HEARTBEAT_MS       30000
#define DEBOUNCE_MS        50

// ---- Siren (optional) ----
#define SIREN_PIN          -1     // Set to a pin if you have a buzzer (-1 = disabled)
#define SIREN_ACTIVE_HIGH  true

// ---- Status LED ----
#define STATUS_LED         13

// ============================================================
// END OF CONFIGURATION
// ============================================================

SoftwareSerial esp(ESP_RX, ESP_TX);

// State
bool hallState = false;
bool lastHallState = false;
unsigned long hallLastChange = 0;
long ultraDist = 999;
long lastUltraDist = 999;

unsigned long lastHallPoll = 0;
unsigned long lastUltraPoll = 0;
unsigned long lastHeartbeat = 0;
bool wifiReady = false;

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(9600);
  esp.begin(ESP_BAUD);

  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  if (HALL_PIN >= 0) {
    pinMode(HALL_PIN, INPUT_PULLUP);
    hallState = digitalRead(HALL_PIN) == HIGH;
    lastHallState = hallState;
  }

  if (ULTRA_TRIG_PIN >= 0) {
    pinMode(ULTRA_TRIG_PIN, OUTPUT);
    pinMode(ULTRA_ECHO_PIN, INPUT);
    digitalWrite(ULTRA_TRIG_PIN, LOW);
  }

  if (SIREN_PIN >= 0) {
    pinMode(SIREN_PIN, OUTPUT);
    digitalWrite(SIREN_PIN, SIREN_ACTIVE_HIGH ? LOW : HIGH);
  }

  Serial.println(F(""));
  Serial.println(F("================================"));
  Serial.print(F("  EZShield Door Unit: "));
  Serial.println(ZONE_NAME);
  Serial.print(F("  Zone ID: "));
  Serial.println(ZONE_ID);
  Serial.println(F("================================"));
  Serial.println(F(""));

  // Initialize ESP-01
  Serial.println(F("[ESP] Initializing..."));
  setupESP();

  // Send initial registration + state
  sendRegistration(ZONE_ID, "hall", ZONE_NAME);
  if (ULTRA_TRIG_PIN >= 0) {
    sendRegistration(ULTRA_ZONE_ID, "ultrasonic", ULTRA_ZONE_NAME);
  }
  sendHallEvent();

  blinkLed(3);
  Serial.println(F("[READY] Monitoring sensors..."));
}

// ============================================================
// MAIN LOOP
// ============================================================

void loop() {
  unsigned long now = millis();

  // Poll hall sensor
  if (now - lastHallPoll >= HALL_POLL_MS) {
    lastHallPoll = now;
    pollHall(now);
  }

  // Poll ultrasonic
  if (ULTRA_TRIG_PIN >= 0 && now - lastUltraPoll >= ULTRA_POLL_MS) {
    lastUltraPoll = now;
    pollUltrasonic();
  }

  // Heartbeat — re-register to stay "connected" on dashboard
  if (now - lastHeartbeat >= HEARTBEAT_MS) {
    lastHeartbeat = now;
    sendHeartbeat();
    sendRegistration(ZONE_ID, "hall", ZONE_NAME);
    if (ULTRA_TRIG_PIN >= 0) {
      sendRegistration(ULTRA_ZONE_ID, "ultrasonic", ULTRA_ZONE_NAME);
    }
  }
}

// ============================================================
// HALL SENSOR
// ============================================================

void pollHall(unsigned long now) {
  bool current = digitalRead(HALL_PIN) == HIGH; // HIGH = open (no magnet)

  if (current != hallState) {
    if (now - hallLastChange >= DEBOUNCE_MS) {
      hallState = current;
      hallLastChange = now;

      if (hallState != lastHallState) {
        lastHallState = hallState;
        sendHallEvent();
        blinkLed(1);
      }
    }
  } else {
    hallLastChange = now;
  }
}

void sendHallEvent() {
  const char* state = hallState ? "open" : "closed";

  Serial.print(F("[HALL] "));
  Serial.print(ZONE_NAME);
  Serial.print(F(": "));
  Serial.println(hallState ? "OPEN" : "CLOSED");

  String json = "{\"zone_id\":";
  json += ZONE_ID;
  json += ",\"sensor_type\":\"hall\",\"event_type\":\"";
  json += state;
  json += "\",\"zone_name\":\"";
  json += ZONE_NAME;
  json += "\",\"device_name\":\"";
  json += DEVICE_NAME;
  json += "\"}";

  postToApi("/api/events", json);
}

// ============================================================
// ULTRASONIC SENSOR
// ============================================================

void pollUltrasonic() {
  digitalWrite(ULTRA_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRA_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRA_TRIG_PIN, LOW);

  long duration = pulseIn(ULTRA_ECHO_PIN, HIGH, 30000);
  long distance = (duration == 0) ? 999 : (duration * 343) / 20000;

  if (distance <= 0 || distance > 400) distance = 999;
  ultraDist = distance;

  long diff = ultraDist - lastUltraDist;
  if (diff < 0) diff = -diff;

  bool crossedThreshold =
    (ultraDist < ULTRA_THRESHOLD && lastUltraDist >= ULTRA_THRESHOLD) ||
    (ultraDist >= ULTRA_THRESHOLD && lastUltraDist < ULTRA_THRESHOLD);

  if (diff >= 2 || crossedThreshold) {
    lastUltraDist = ultraDist;
    sendUltraEvent();
    if (ultraDist < ULTRA_THRESHOLD) blinkLed(1);
  }
}

void sendUltraEvent() {
  bool triggered = ultraDist < ULTRA_THRESHOLD;

  Serial.print(F("[ULTRA] "));
  Serial.print(ULTRA_ZONE_NAME);
  Serial.print(F(": "));
  Serial.print(ultraDist);
  Serial.println(F("cm"));

  String json = "{\"zone_id\":";
  json += ULTRA_ZONE_ID;
  json += ",\"sensor_type\":\"ultrasonic\",\"event_type\":\"";
  json += (triggered ? "triggered" : "clear");
  json += "\",\"value\":\"";
  json += ultraDist;
  json += "\",\"zone_name\":\"";
  json += ULTRA_ZONE_NAME;
  json += "\",\"device_name\":\"";
  json += DEVICE_NAME;
  json += "\"}";

  postToApi("/api/events", json);
}

// ============================================================
// REGISTRATION & HEARTBEAT
// ============================================================

void sendRegistration(int zoneId, const char* sensorType, const char* zoneName) {
  String json = "{\"zone_id\":";
  json += zoneId;
  json += ",\"sensor_type\":\"";
  json += sensorType;
  json += "\",\"event_type\":\"register\",\"zone_name\":\"";
  json += zoneName;
  json += "\",\"device_name\":\"";
  json += DEVICE_NAME;
  json += "\"}";

  postToApi("/api/events", json);
}

void sendHeartbeat() {
  postToApi("/api/heartbeat", "{}");
  Serial.println(F("[HEARTBEAT] Sent"));
}

// ============================================================
// ESP-01 AT COMMAND FUNCTIONS
// ============================================================

void setupESP() {
  // Reset
  sendAT("AT+RST", 3000);
  delay(2000);
  drainESP();

  // Set WiFi mode to station
  sendAT("AT+CWMODE=1", 1000);

  // Connect to WiFi
  Serial.print(F("[ESP] Connecting to WiFi: "));
  Serial.println(WIFI_SSID);

  String cmd = "AT+CWJAP=\"";
  cmd += WIFI_SSID;
  cmd += "\",\"";
  cmd += WIFI_PASSWORD;
  cmd += "\"";

  esp.println(cmd);

  // Wait for connection (can take up to 15 seconds)
  unsigned long start = millis();
  bool connected = false;

  while (millis() - start < 15000) {
    if (esp.available()) {
      String line = esp.readStringUntil('\n');
      line.trim();
      if (line.length() > 0) {
        Serial.print(F("  > "));
        Serial.println(line);
      }
      if (line.indexOf("OK") >= 0 || line.indexOf("CONNECTED") >= 0 || line.indexOf("GOT IP") >= 0) {
        connected = true;
      }
      if (line.indexOf("FAIL") >= 0 || line.indexOf("ERROR") >= 0) {
        break;
      }
    }
    // Break if we got IP
    if (connected && millis() - start > 5000) break;
  }

  if (connected) {
    Serial.println(F("[ESP] WiFi connected!"));
    wifiReady = true;

    // Enable multiple connections
    sendAT("AT+CIPMUX=0", 1000);
  } else {
    Serial.println(F("[ESP] WiFi FAILED — will retry on heartbeat"));
    wifiReady = false;
  }
}

void postToApi(const char* path, String& body) {
  if (!wifiReady) {
    // Try to reconnect
    setupESP();
    if (!wifiReady) return;
  }

  // Build HTTP request
  String httpReq = "POST ";
  httpReq += path;
  httpReq += " HTTP/1.1\r\nHost: ";
  httpReq += API_HOST;
  httpReq += "\r\nContent-Type: application/json\r\nx-api-key: ";
  httpReq += API_KEY;
  httpReq += "\r\nContent-Length: ";
  httpReq += body.length();
  httpReq += "\r\nConnection: close\r\n\r\n";
  httpReq += body;

  // Open TCP/SSL connection
  String cipstart;
  if (API_PORT == 443) {
    cipstart = "AT+CIPSTART=\"SSL\",\"";
  } else {
    cipstart = "AT+CIPSTART=\"TCP\",\"";
  }
  cipstart += API_HOST;
  cipstart += "\",";
  cipstart += API_PORT;

  esp.println(cipstart);
  if (!waitFor("OK", 5000)) {
    Serial.println(F("[API] Connection failed"));
    // Check if WiFi dropped
    if (!checkWifi()) {
      wifiReady = false;
    }
    return;
  }

  // Send data length
  String cipsend = "AT+CIPSEND=";
  cipsend += httpReq.length();
  esp.println(cipsend);

  if (!waitFor(">", 3000)) {
    Serial.println(F("[API] Send prompt failed"));
    return;
  }

  // Send the HTTP request
  esp.print(httpReq);

  // Wait for response
  if (waitFor("SEND OK", 5000)) {
    // Read response (just check for 200)
    unsigned long start = millis();
    bool gotResponse = false;
    while (millis() - start < 3000) {
      if (esp.available()) {
        String line = esp.readStringUntil('\n');
        if (line.indexOf("200") >= 0 || line.indexOf("201") >= 0) {
          gotResponse = true;
        }
      }
    }
    if (gotResponse) {
      Serial.println(F("[API] OK"));
    }
  }

  // Close connection
  sendAT("AT+CIPCLOSE", 1000);
}

bool checkWifi() {
  esp.println("AT+CWJAP?");
  return waitFor("OK", 2000);
}

String sendAT(const char* cmd, unsigned long timeout) {
  drainESP();
  esp.println(cmd);

  String response = "";
  unsigned long start = millis();

  while (millis() - start < timeout) {
    if (esp.available()) {
      char c = esp.read();
      response += c;
    }
  }

  return response;
}

bool waitFor(const char* target, unsigned long timeout) {
  unsigned long start = millis();
  String buffer = "";

  while (millis() - start < timeout) {
    if (esp.available()) {
      char c = esp.read();
      buffer += c;
      if (buffer.indexOf(target) >= 0) {
        return true;
      }
    }
  }
  return false;
}

void drainESP() {
  while (esp.available()) {
    esp.read();
  }
}

// ============================================================
// STATUS LED
// ============================================================

void blinkLed(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED, HIGH);
    delay(50);
    digitalWrite(STATUS_LED, LOW);
    if (i < times - 1) delay(100);
  }
}
