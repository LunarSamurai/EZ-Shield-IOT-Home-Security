# Connecting Door Units to the Dashboard

## How It Works

```
[Reed Switch + Ultrasonic] → [Arduino] → AT commands → [ESP-01] → WiFi → [Vercel API] → [Dashboard]
```

Each door is a self-contained unit. The Arduino reads the sensors, builds JSON, and tells the ESP-01 to POST it over WiFi. No Pi server required (but you can use one for local terminal monitoring).

## Wiring Each Unit

### ESP-01 to Arduino

```
Arduino Pin 2   ←──  ESP-01 TX
Arduino Pin 3   ──→  1kΩ ──→ ESP-01 RX
                            |
                          2kΩ
                            |
                           GND

3.3V Regulator  ──→  ESP-01 VCC
3.3V Regulator  ──→  ESP-01 CH_PD (EN)
Arduino GND     ──→  ESP-01 GND
                     ESP-01 GPIO0 → leave floating (run mode)
```

**Use a 3.3V regulator (AMS1117-3.3)** — the Arduino's built-in 3.3V pin can't supply enough current for the ESP-01.

### Reed Switch (Hall Sensor)

```
Arduino Pin 4  ────  [Reed Switch]  ────  GND
```

Mount the reed switch on the door frame. Mount the magnet on the door. When the door closes, the magnet holds the switch closed (pin reads LOW = closed).

### Ultrasonic Sensor (Optional)

```
Arduino 5V    ──→  HC-SR04 VCC
Arduino GND   ──→  HC-SR04 GND
Arduino Pin 8 ──→  HC-SR04 TRIG
Arduino Pin 9 ←──  HC-SR04 ECHO
```

No voltage divider needed here — the Arduino is 5V tolerant.

### Siren/Buzzer (Optional)

```
Arduino Pin (set SIREN_PIN) ──→ 220Ω ──→ Buzzer+ ──→ GND
```

## Power

Each unit can be powered by:
- USB cable (5V)
- 9V barrel jack adapter (for Arduino Uno)
- 5V phone charger + USB cable

The ESP-01 gets 3.3V from the regulator. Make sure the regulator input connects to 5V.

## Verifying Connection

1. Power on the unit
2. Open Serial Monitor at 9600 baud (if connected to computer)
3. You should see WiFi connect and API OK messages
4. Open the dashboard — the zone should appear with a green dot and show OPEN or CLOSED

## Using the Pi Server (Optional)

If you want a terminal display on the Pi showing all events:

```bash
cd pi-server
node src/index.js --mode wifi --http-port 8266 --api-url https://your-app.vercel.app/api --api-key your-key
```

Then in the Arduino sketch, change `API_HOST` to your Pi's IP and `API_PORT` to `8266`. The Pi server will display events in the terminal and forward them to Vercel.

## Multiple Units

Each unit operates independently over WiFi. Just make sure:
- Every unit has a **unique ZONE_ID**
- All units have the **same WiFi credentials, API host, and API key**
- If a unit has an ultrasonic sensor, its `ULTRA_ZONE_ID` must also be unique
