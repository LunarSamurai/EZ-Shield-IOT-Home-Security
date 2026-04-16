# EZShield Home Security System

Full-stack home security dashboard with Raspberry Pi serial collector, ESP/Arduino sensors, and a Next.js web app.

## Architecture

```
ESP/Arduino (sensors) --serial--> Pi Server --REST API--> Next.js (Vercel) --Supabase--> Dashboard
```

## Setup

### 1. Supabase

- Create a Supabase project
- Run both SQL migration files in order:
  - `webapp/supabase/migrations/001_initial_schema.sql`
  - `webapp/supabase/migrations/002_settings_and_registration.sql`
- Copy your project URL, anon key, and service role key

### 2. Web App

```bash
cd webapp
cp .env.local.example .env.local
# Fill in your Supabase keys and PI_API_KEY
npm install
npm run dev
```

Deploy to Vercel: connect the `webapp/` directory.

### 3. Pi Server

```bash
cd pi-server
cp .env.example .env
# Fill in API_KEY (same as PI_API_KEY in webapp) and API_URL
npm install
node src/index.js --port /dev/ttyUSB0 --baud 9600
```

CLI options:
- `--port <path>` — Serial port (default: `/dev/ttyUSB0`)
- `--baud <rate>` — Baud rate (default: `9600`)
- `--api-url <url>` — API base URL (default: `http://localhost:3000/api`)
- `--api-key <key>` — API authentication key
- `--list-ports` — List available serial ports and exit
- `--no-heartbeat` — Disable heartbeat pings

### 4. Registration Secret

The default registration secret is `EZ2025`. Change it in the Supabase `app_config` table (key: `registration_secret`). New users must enter this code when creating an account.

---

## ESP/Arduino Serial Protocol

The ESP module communicates with the Pi server over serial (UART). Each message is a single line terminated by `\n`.

### Message Format

All messages use colon-separated fields:

```
TYPE:ZONE_ID:DATA[:EXTRA...]
```

### 1. Zone Registration (REG)

**Send this once on boot** to register each sensor with the system. Zones are auto-created in the database.

```
REG:<zone_id>:<sensor_type>:<zone_name>:<device_name>
```

| Field | Type | Description |
|-------|------|-------------|
| `zone_id` | integer | Unique zone number (1-255) |
| `sensor_type` | string | `HALL` or `ULTRA` |
| `zone_name` | string | Human-readable name shown on dashboard |
| `device_name` | string | Optional device identifier |

**Examples:**
```
REG:1:HALL:Front Door:ESP32-Main
REG:2:HALL:Back Door:ESP32-Main
REG:3:HALL:Garage Door:ESP32-Garage
REG:4:HALL:Kitchen Window:ESP32-Main
REG:5:ULTRA:Hallway Motion:ESP32-Main
REG:6:ULTRA:Driveway:ESP32-Outdoor
```

### 2. Hall Sensor Events (magnetic door/window sensors)

```
HALL:<zone_id>:<state>
```

| Field | Type | Description |
|-------|------|-------------|
| `zone_id` | integer | Zone number matching the REG message |
| `state` | string | `OPEN` or `CLOSED` |

**Examples:**
```
HALL:1:OPEN      <- front door opened
HALL:1:CLOSED    <- front door closed
HALL:3:OPEN      <- garage door opened
```

### 3. Ultrasonic Sensor Events (proximity detection)

```
ULTRA:<zone_id>:DIST:<distance_cm>
```

| Field | Type | Description |
|-------|------|-------------|
| `zone_id` | integer | Zone number matching the REG message |
| `distance_cm` | integer | Distance reading in centimeters |

**Examples:**
```
ULTRA:5:DIST:120    <- hallway clear (120cm)
ULTRA:5:DIST:25     <- hallway triggered (25cm, below 30cm threshold)
ULTRA:6:DIST:450    <- driveway clear
ULTRA:6:DIST:40     <- driveway motion detected
```

### Arduino/ESP Code Variables

In your ESP sketch, set these variables to configure each sensor:

```cpp
// ============================================================
// CONFIGURATION — Set these for your specific setup
// ============================================================

// Device name — identifies this ESP module
const char* DEVICE_NAME = "ESP32-Main";

// Zone definitions — each sensor gets a unique zone ID
// Zone IDs must be unique across ALL ESP modules

// Hall effect sensors (magnetic door/window sensors)
#define HALL_ZONE_1_ID    1
#define HALL_ZONE_1_NAME  "Front Door"
#define HALL_ZONE_1_PIN   GPIO_NUM_4

#define HALL_ZONE_2_ID    2
#define HALL_ZONE_2_NAME  "Back Door"
#define HALL_ZONE_2_PIN   GPIO_NUM_5

// Ultrasonic sensors
#define ULTRA_ZONE_1_ID     5
#define ULTRA_ZONE_1_NAME   "Hallway Motion"
#define ULTRA_ZONE_1_TRIG   GPIO_NUM_12
#define ULTRA_ZONE_1_ECHO   GPIO_NUM_13

// Baud rate — must match Pi server --baud flag
#define SERIAL_BAUD 9600

// ============================================================
// SETUP — sends registration messages
// ============================================================

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000); // Wait for Pi server to be ready

  // Register all zones on boot
  Serial.println("REG:" + String(HALL_ZONE_1_ID) + ":HALL:" + HALL_ZONE_1_NAME + ":" + DEVICE_NAME);
  Serial.println("REG:" + String(HALL_ZONE_2_ID) + ":HALL:" + HALL_ZONE_2_NAME + ":" + DEVICE_NAME);
  Serial.println("REG:" + String(ULTRA_ZONE_1_ID) + ":ULTRA:" + ULTRA_ZONE_1_NAME + ":" + DEVICE_NAME);

  // Setup pins...
  pinMode(HALL_ZONE_1_PIN, INPUT_PULLUP);
  pinMode(HALL_ZONE_2_PIN, INPUT_PULLUP);
  pinMode(ULTRA_ZONE_1_TRIG, OUTPUT);
  pinMode(ULTRA_ZONE_1_ECHO, INPUT);
}

// ============================================================
// LOOP — reads sensors and sends data
// ============================================================

void loop() {
  // Read hall sensors
  // digitalRead returns LOW when magnet is present (door closed)
  bool door1Open = digitalRead(HALL_ZONE_1_PIN) == HIGH;
  Serial.println("HALL:" + String(HALL_ZONE_1_ID) + ":" + (door1Open ? "OPEN" : "CLOSED"));

  bool door2Open = digitalRead(HALL_ZONE_2_PIN) == HIGH;
  Serial.println("HALL:" + String(HALL_ZONE_2_ID) + ":" + (door2Open ? "OPEN" : "CLOSED"));

  // Read ultrasonic
  long distance = readUltrasonic(ULTRA_ZONE_1_TRIG, ULTRA_ZONE_1_ECHO);
  Serial.println("ULTRA:" + String(ULTRA_ZONE_1_ID) + ":DIST:" + String(distance));

  delay(500); // Poll every 500ms
}

long readUltrasonic(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000);
  return duration * 0.034 / 2; // Convert to cm
}
```

### Key Rules

1. **Zone IDs must be unique** across all ESP modules
2. **Send REG messages on every boot** — the system uses them to know a sensor is connected
3. **Zone names** can contain any characters except `:` (colon) and `\n` (newline)
4. **Baud rate** must match between ESP `Serial.begin()` and Pi server `--baud` flag
5. Zones show as **DISCONNECTED** on the dashboard if no data is received for 60 seconds
6. The Pi server will auto-reconnect if the serial connection drops
