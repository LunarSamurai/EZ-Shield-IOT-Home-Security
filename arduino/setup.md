# Flashing a Door Unit

Each door gets its own Arduino + ESP-01 + sensors. One sketch controls everything.

## Install Arduino IDE

Download from [arduino.cc/en/software](https://www.arduino.cc/en/software).

## Open the Sketch

1. **File → Open** → navigate to `arduino/ezshield_door/ezshield_door.ino`

## Edit the Configuration

At the top of the file, change these for each door:

```cpp
// WiFi
const char* WIFI_SSID      = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";

// API
const char* API_HOST        = "your-app.vercel.app";  // Your Vercel domain
const char* API_KEY         = "your-key-here";         // Matches PI_API_KEY in .env.local

// This door
#define ZONE_ID             1                // Unique per door (1, 2, 3, etc.)
#define ZONE_NAME           "Front Door"     // Name shown on dashboard
#define DEVICE_NAME         "Door-Unit-1"    // Identifies this Arduino

// Sensor pins
#define HALL_PIN            4                // Reed switch pin
#define ULTRA_TRIG_PIN      8                // Ultrasonic TRIG (-1 to disable)
#define ULTRA_ECHO_PIN      9                // Ultrasonic ECHO
#define ULTRA_ZONE_ID       101              // Separate zone ID for ultrasonic
```

**For each door, you only need to change:**
- `ZONE_ID` — 1 for front door, 2 for back door, 3 for garage, etc.
- `ZONE_NAME` — the name that shows on the dashboard
- `DEVICE_NAME` — whatever you want to call this unit
- Pin numbers if your wiring differs

WiFi, API host, and API key stay the same across all units.

## Upload

1. Connect the Arduino via USB
2. **Tools → Board** → select your Arduino (Uno, Nano, etc.)
3. **Tools → Port** → select the COM port
4. Click **Upload**

## Test

1. Open **Tools → Serial Monitor** at 9600 baud
2. You should see:

```
================================
  EZShield Door Unit: Front Door
  Zone ID: 1
================================

[ESP] Initializing...
[ESP] Connecting to WiFi: YOUR_WIFI_NAME... WiFi connected!
[HALL] Front Door: CLOSED
[API] OK
[HEARTBEAT] Sent
[READY] Monitoring sensors...
```

3. Open/close the door — you'll see state changes
4. Check your dashboard — the zone should appear with a green dot

## Example: Setting Up 3 Doors

Flash the same sketch 3 times, just change the config each time:

| Unit | ZONE_ID | ZONE_NAME | DEVICE_NAME |
|------|---------|-----------|-------------|
| 1 | 1 | Front Door | Door-Unit-1 |
| 2 | 2 | Back Door | Door-Unit-2 |
| 3 | 3 | Garage Door | Door-Unit-3 |

If a unit also has an ultrasonic sensor, give it a unique `ULTRA_ZONE_ID` (like 101, 102, 103).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `[ESP] WiFi FAILED` | Check SSID and password. Make sure ESP-01 has 3.3V power (not 5V). |
| `[API] Connection failed` | Check API_HOST is correct. Make sure ESP-01 firmware supports SSL (AT v1.7+). |
| `[API] Error: 401` | API_KEY doesn't match PI_API_KEY in your webapp .env.local |
| ESP-01 keeps resetting | Not enough power. Use an AMS1117-3.3V regulator, not the Arduino's 3.3V pin. |
| No response from ESP-01 | Check wiring. Pin 2 → ESP TX, Pin 3 → ESP RX (with voltage divider). |
| Zone shows "Disconnected" | Unit must send data every 60s. Heartbeat runs every 30s. Check WiFi. |
