<p align="center">
  <img src="https://img.shields.io/badge/EZ%20Shield-Home%20Security-0a1628?style=for-the-badge&labelColor=FFD700&color=0a1628" alt="EZ Shield" />
  <br/>
  <img src="https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vercel-000?style=flat-square&logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/Arduino-00979D?style=flat-square&logo=arduino&logoColor=white" alt="Arduino" />
  <img src="https://img.shields.io/badge/Raspberry_Pi-C51A4A?style=flat-square&logo=raspberrypi&logoColor=white" alt="Raspberry Pi" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
</p>

<h1 align="center">EZ Shield</h1>
<h3 align="center">Home Security Without the Subscription</h3>

<p align="center">
  A product by <strong>Flash Bang LLC</strong>
</p>

<p align="center">
  Open-source, self-hosted home security system built on hardware you own.<br/>
  No monthly fees. No cloud lock-in. No phone-home telemetry.<br/>
  Your home, your data, your rules.
</p>

---

## Why EZ Shield?

Traditional home security means paying $30-60/month for someone else to watch your doors. That's $360-720 a year for a service that works until the company decides to raise prices, sunset your hardware, or sell your data.

EZ Shield is different.

- **Zero subscriptions** — Deploy once, run forever. You own the hardware and the software.
- **Real-time dashboard** — Touch-optimized web app with live sensor status, armed/disarmed modes, and instant alerts.
- **True privacy** — Your sensor data stays on your infrastructure. Supabase can be self-hosted. Nothing phones home.
- **Expandable** — Each door is an independent sensor unit. Add a new entry point in minutes by flashing another Arduino.
- **Professional-grade features** — Entry/exit delays, PIN-protected arming, configurable alert cooldowns, per-zone monitoring, activity logging.

---

## System Architecture

```
                                          ┌─────────────────────┐
                                          │   Web Dashboard     │
                                          │   (Vercel + Next.js)│
                                          │                     │
                                          │  Login / Dashboard  │
                                          │  Stay / Away / Dis  │
                                          └────────▲────────────┘
                                                   │ HTTPS
                                                   │
                                          ┌────────┴────────────┐
                                          │   Supabase          │
                                          │   Auth + Database   │
                                          │   Realtime Subs     │
                                          └────────▲────────────┘
                                                   │ REST API
                                                   │
                              ┌─────────────────────┼─────────────────────┐
                              │                     │                     │
                    ┌─────────┴──────┐    ┌─────────┴──────┐    ┌─────────┴──────┐
                    │  Door Unit 1   │    │  Door Unit 2   │    │  Door Unit N   │
                    │  Arduino+ESP01 │    │  Arduino+ESP01 │    │  Arduino+ESP01 │
                    │  Hall+Ultra    │    │  Hall+Ultra    │    │  Hall+Ultra    │
                    └────────────────┘    └────────────────┘    └────────────────┘
                         WiFi                  WiFi                  WiFi
```

Each door unit is a self-contained Arduino with an ESP-01 WiFi module. It reads its sensors, builds JSON payloads, and POSTs directly to your API over WiFi. No hub required. No single point of failure.

An optional **Raspberry Pi server** can sit on your local network as a relay and terminal monitor, displaying color-coded events with ASCII art.

---

## What's in the Box

| Directory | What It Does |
|-----------|-------------|
| `webapp/` | Next.js 16 dashboard — login, security modes, zone monitoring, settings, alerts. Deployed to Vercel with Supabase for auth and realtime. |
| `pi-server/` | Node.js collector service for the Raspberry Pi. Receives events via serial (USB) or HTTP (WiFi) and forwards to the API. Optional but useful for local monitoring. |
| `arduino/` | Single Arduino sketch that runs each door unit. Reads hall effect and ultrasonic sensors, controls the ESP-01 via AT commands, and POSTs data over WiFi. |

---

## Hardware Requirements

**Per door unit:**
- 1x Arduino (Uno, Nano, or Mega)
- 1x ESP-01 (ESP8266 WiFi module)
- 1x Magnetic reed switch (hall effect door/window sensor)
- 1x HC-SR04 ultrasonic sensor (optional, for proximity detection)
- 1x AMS1117-3.3V voltage regulator (to power the ESP-01)
- Resistors: 1k and 2k for voltage divider (5V Arduino TX to 3.3V ESP RX)
- Breadboard and jumper wires

**Infrastructure:**
- WiFi network
- Supabase account (free tier works)
- Vercel account (free tier works)
- Raspberry Pi (optional, for local terminal monitoring)

**Estimated cost per door unit: ~$12-15 in components.**

---

## Setup Guide

### 1. Database — Supabase

Create a free project at [supabase.com](https://supabase.com).

Open the **SQL Editor** and run these two migration files in order:

```
webapp/supabase/migrations/001_initial_schema.sql
webapp/supabase/migrations/002_settings_and_registration.sql
```

This creates all tables, row-level security policies, realtime subscriptions, and default configuration.

From your Supabase project dashboard, copy:
- **Project URL** (Settings > API)
- **Anon public key** (Settings > API)
- **Service role key** (Settings > API — keep this secret)

### 2. Web App — Vercel

```bash
cd webapp
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PI_API_KEY=your-secret-api-key
```

The `PI_API_KEY` is a secret string you create. It authenticates requests from your sensor units. Generate one with:

```bash
openssl rand -hex 32
```

Run locally to test:

```bash
npm run dev
```

Deploy to Vercel by connecting your GitHub repo and setting the root directory to `webapp/`. Add the same environment variables in the Vercel dashboard under Settings > Environment Variables.

### 3. Arduino Door Units

See [`arduino/setup.md`](arduino/setup.md) for full flashing instructions.

Quick version:

1. Install [Arduino IDE](https://www.arduino.cc/en/software)
2. Open `arduino/ezshield_door/ezshield_door.ino`
3. Edit the configuration at the top of the file:
   - WiFi credentials
   - Your Vercel app domain
   - Your API key (same as `PI_API_KEY`)
   - Zone ID and name for this specific door
   - Sensor pin numbers
4. Select your board and port under **Tools**
5. Upload

Repeat for each door unit, changing only the `ZONE_ID`, `ZONE_NAME`, and `DEVICE_NAME`.

See [`arduino/wiring.md`](arduino/wiring.md) for detailed wiring diagrams.

### 4. Raspberry Pi Server (Optional)

The Pi server provides a local terminal display of all events with color-coded output and ASCII art. It can receive data from door units via WiFi (HTTP) and/or USB serial, then forward to your Vercel API.

```bash
cd pi-server
npm install
```

Create a `.env` file:

```env
API_URL=https://your-app.vercel.app/api
API_KEY=your-secret-api-key
```

Run in WiFi mode (receives HTTP from ESP-01 modules):

```bash
node src/index.js --mode wifi --http-port 8266 --api-url https://your-app.vercel.app/api --api-key your-key
```

Or serial mode (USB connection to a single Arduino):

```bash
node src/index.js --mode serial --port /dev/ttyUSB0 --baud 9600 --api-key your-key
```

Or both simultaneously:

```bash
node src/index.js --mode both --port /dev/ttyUSB0 --http-port 8266 --api-key your-key
```

**Note:** The Pi server is not required. Door units can POST directly to your Vercel API. The Pi server is useful for local network monitoring, debugging, and as a relay if you prefer to keep your sensor traffic internal.

---

## Security Model

EZ Shield was designed with security as a first principle, not an afterthought.

### Authentication & Access Control

- **Supabase Auth** handles all user authentication with email/password and session management.
- **Registration secret** — New accounts require a 6-character alphanumeric code. Without it, nobody can create an account on your system. The default is `EZ2025` — change it immediately in the Supabase `app_config` table.
- **PIN-protected arming** — Changing the system mode (Stay, Away, Disarm) requires entering a 4-6 digit PIN. First-time users are forced to set their PIN before they can do anything.
- **Row-Level Security (RLS)** — Every Supabase table has RLS policies. Users can only read their own profile. Sensor data is read-only for authenticated users. Write access is restricted to the service role.

### API Security

- **API key authentication** — All requests from door units include an `x-api-key` header. The API rejects anything without a valid key.
- **Service role isolation** — The browser client uses the anon key (read-only for most tables). Sensor event ingestion uses the service role key, which is never exposed to the browser.
- **No secrets in client code** — The `SUPABASE_SERVICE_ROLE_KEY` and `PI_API_KEY` are server-side only, never bundled into the frontend.

### Network Security

- **HTTPS everywhere** — All communication between door units and the API is over HTTPS (port 443 with SSL on the ESP-01).
- **No port forwarding required** — Door units POST outbound to your Vercel app. Nothing needs to be exposed on your home network.
- **WiFi isolation** — Each door unit only needs outbound HTTPS access. They don't listen on any ports and can be placed on an IoT VLAN.

### Recommendations

- Change the default registration secret immediately after first setup.
- Use a strong, unique `PI_API_KEY` (at least 32 characters).
- Place door units on a separate IoT VLAN if your router supports it.
- Enable Supabase email confirmation to prevent unauthorized signups.
- Rotate your API key periodically by updating both the `.env.local` and Arduino sketches.
- If self-hosting Supabase, follow their [production security checklist](https://supabase.com/docs/guides/platform/going-into-production).

---

## Dashboard Features

### Login
The login page opens with a cinematic flashbang animation — a grenade lobs onto screen, bounces with spark particles, and detonates into a white flash. The EZ Shield logo emerges from the blast, and the login form slides into view. Dark navy and electric yellow color scheme throughout.

### Security Modes
Three large touch-friendly buttons for **Stay**, **Away**, and **Disarm**. Each mode change requires PIN verification through a touch-optimized numpad modal.

- **Stay** — Perimeter sensors active, interior sensors bypassed. For when you're home.
- **Away** — All sensors active. Full protection when nobody's home.
- **Disarm** — All monitoring disabled. Acknowledges any active alerts.

### Zone Monitoring
Each sensor zone appears as a card with real-time status:

- **Hall sensors** — Shows SECURED (green) or OPEN (red with flashing indicator)
- **Ultrasonic sensors** — Shows distance reading with a visual threshold bar
- **Disconnected zones** — Dimmed card with red DISCONNECTED label and "Check your door sensors" warning

Zones are auto-registered when door units boot up. No manual configuration needed.

### Settings
Slide-out panel accessible via the cogwheel icon in the header:

- Entry/exit delay timing
- Alarm duration
- Siren enable/disable
- Auto-arm scheduling
- Alert cooldown between repeat triggers
- Ultrasonic polling rate
- PIN change

### Alerts & Activity
- Flashing red alarm banner when a zone triggers while armed
- Scrolling activity feed with timestamped events
- System status showing Pi server connection, active alert count, and current time

---

## Serial Protocol Reference

Door units communicate using a simple colon-delimited text protocol over serial (Arduino to ESP-01) and JSON over HTTP (ESP-01 to API).

### Registration
```
REG:<zone_id>:<sensor_type>:<zone_name>:<device_name>
```
Sent on boot and every 30 seconds as a heartbeat. Auto-creates zones in the database.

### Hall Sensor Events
```
HALL:<zone_id>:<OPEN|CLOSED>
```

### Ultrasonic Sensor Events
```
ULTRA:<zone_id>:DIST:<distance_cm>
```

### Rules
- Zone IDs must be globally unique across all door units
- Zone names cannot contain colons or newlines
- Zones show as disconnected if no data is received within 60 seconds
- Baud rate must match between Arduino sketch and Pi server (default: 9600)

Full protocol documentation with examples is in the Arduino sketch comments.

---

## Project Structure

```
EZ-Shield-IOT-Home-Security/
│
├── arduino/                         # Sensor unit firmware
│   ├── ezshield_door/
│   │   └── ezshield_door.ino        # Single sketch for each door unit
│   ├── setup.md                     # Flashing guide
│   ├── wiring.md                    # Wiring diagrams
│   └── connecting-to-pi.md          # Connection & troubleshooting
│
├── pi-server/                       # Raspberry Pi collector (optional)
│   ├── src/
│   │   ├── index.js                 # Entry point, CLI, ASCII art banner
│   │   ├── serial.js                # USB serial reader & parser
│   │   ├── http-server.js           # HTTP receiver for WiFi door units
│   │   ├── api-client.js            # Forwards events to Vercel API
│   │   └── config.js                # Environment configuration
│   └── package.json
│
├── webapp/                          # Next.js 16 dashboard
│   ├── supabase/migrations/         # Database schema (run in order)
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/               # Flashbang animation + auth
│   │   │   ├── dashboard/           # Main security dashboard
│   │   │   └── api/                 # REST endpoints for sensor data
│   │   ├── components/
│   │   │   ├── login/               # FlashbangEffect, ShieldLogo, LoginForm
│   │   │   ├── dashboard/           # ModeControls, ZoneGrid, AlertBanner, etc.
│   │   │   └── ui/                  # ShieldIcon, GlowButton
│   │   ├── hooks/                   # Realtime subscriptions
│   │   └── lib/                     # Supabase clients, types
│   └── package.json
│
└── README.md
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Dashboard | Next.js 16, Tailwind CSS, Framer Motion | Touch-optimized security UI with animations |
| Backend | Supabase (PostgreSQL + Auth + Realtime) | Database, authentication, live subscriptions |
| Hosting | Vercel | Zero-config deployment with edge functions |
| Collector | Node.js on Raspberry Pi | Local serial/WiFi bridge with terminal display |
| Firmware | Arduino + ESP-01 (ESP8266) | Sensor reading + WiFi HTTP client via AT commands |
| Sensors | Hall effect reed switches, HC-SR04 ultrasonic | Door/window state + proximity detection |

---

## Frequently Asked Questions

**Can I use this without a Raspberry Pi?**
Yes. Door units POST directly to your Vercel API over WiFi. The Pi server is optional and only useful for local terminal monitoring.

**How many doors can I monitor?**
As many as you want. Each door is an independent unit with its own Arduino and ESP-01. They connect over WiFi, so there's no physical limit.

**Does it work if my internet goes down?**
The door units will buffer and retry. The dashboard won't update until connectivity returns. For fully offline operation, consider self-hosting Supabase on the Pi.

**Can I use ESP32 instead of ESP-01?**
Yes, but you'd need to modify the sketch to use the ESP32's built-in WiFi libraries instead of AT commands. The protocol and API are the same.

**Is this UL/FCC certified?**
No. EZ Shield is a DIY open-source project. It is not a replacement for professionally monitored security systems in situations where certification is required.

---

## Contributing

Pull requests are welcome. If you're adding a new sensor type, follow the existing protocol format and ensure zone IDs remain globally unique.

For bugs and feature requests, open an issue.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>EZ Shield</strong> by Flash Bang LLC<br/>
  <em>Your home. Your data. Your security.</em>
</p>
