# EZShield ESP8266 Wiring Guide

## ESP8266 Pin Reference (NodeMCU/D1 Mini)

| Label | GPIO | Default Use        |
|-------|------|--------------------|
| D1    | 5    | Hall Sensor 1      |
| D2    | 4    | Hall Sensor 2      |
| D3    | 0    | Ultrasonic 1 TRIG  |
| D4    | 2    | Ultrasonic 1 ECHO  |
| D5    | 14   | Hall Sensor 3      |
| D6    | 12   | Hall Sensor 4      |
| D7    | 13   | Ultrasonic 2 TRIG  |
| D8    | 15   | Ultrasonic 2 ECHO  |

## Hall Effect / Reed Switch Wiring

Reed switches are simple two-wire devices. No resistor needed (internal pullup is used).

```
ESP8266 GPIO (D1) ----[Reed Switch]---- GND
```

- Door **closed** (magnet near): switch closes, pin reads LOW
- Door **open** (magnet away): switch opens, pin reads HIGH (pullup)

Mount the reed switch on the door frame and the magnet on the door itself. When the door closes, the magnet holds the switch closed.

## Ultrasonic HC-SR04 Wiring

**IMPORTANT**: The standard HC-SR04 runs on 5V and outputs 5V on ECHO. The ESP8266 GPIOs are 3.3V! You MUST use a voltage divider on the ECHO pin or use the **HC-SR04P** (3.3V variant).

### With voltage divider (standard HC-SR04):

```
HC-SR04 VCC  ----  5V (VIN on NodeMCU)
HC-SR04 GND  ----  GND
HC-SR04 TRIG ----  ESP GPIO (D3)
HC-SR04 ECHO ----  1kΩ resistor ---- ESP GPIO (D4)
                                  |
                              2kΩ resistor
                                  |
                                 GND
```

### With HC-SR04P (3.3V version, no divider needed):

```
HC-SR04P VCC  ----  3.3V
HC-SR04P GND  ----  GND
HC-SR04P TRIG ----  ESP GPIO (D3)
HC-SR04P ECHO ----  ESP GPIO (D4)
```

## Buzzer / Siren (Optional)

For a passive buzzer or relay-controlled siren:

```
ESP GPIO ---- [220Ω resistor] ---- Buzzer+ 
                                   Buzzer- ---- GND
```

For a relay module (for loud siren):

```
ESP GPIO ---- Relay IN
ESP 3.3V ---- Relay VCC
ESP GND  ---- Relay GND
Siren+   ---- Relay NO (normally open)
Siren-   ---- External power GND
External power+ ---- Relay COM
```

## Serial Connection to Raspberry Pi

```
ESP8266 TX (GPIO1) ---- Pi RX (GPIO15 / pin 10)
ESP8266 GND        ---- Pi GND
```

Only TX from ESP to Pi RX is required for sensor data. If you want Pi-to-ESP commands (siren control), also connect:

```
ESP8266 RX (GPIO3) ---- Pi TX (GPIO14 / pin 8)
```

**Baud rate**: Both must match (default: 9600). Set in `config.h` and Pi server `--baud` flag.

If using USB instead of direct GPIO serial:
- Connect ESP8266 via USB cable to the Pi
- Use `--port /dev/ttyUSB0` on the Pi server
- No extra wiring needed

## Power

- ESP8266 can be powered via USB (5V micro-USB)
- Or via VIN pin (5V) from a regulated supply
- Current draw: ~80mA normal, ~170mA peak during WiFi (not used here, but the chip draws it anyway)
- Add a 100µF capacitor across VCC/GND near the ESP for stability if using long wire runs
