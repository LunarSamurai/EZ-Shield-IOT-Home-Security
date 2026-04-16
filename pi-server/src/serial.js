import { SerialPort } from 'serialport';
import { ReadlineParser } from 'serialport';
import chalk from 'chalk';

export class SerialReader {
  constructor(portPath, baudRate, onEvent) {
    this.portPath = portPath;
    this.baudRate = baudRate;
    this.onEvent = onEvent;
    this.port = null;
    this.parser = null;
    this.reconnecting = false;
    // Zone name registry — populated from REG messages or config
    this.zoneNames = {};
    this.deviceNames = {};
  }

  connect() {
    console.log(chalk.cyan(`\n  [SERIAL] Connecting to ${this.portPath} @ ${this.baudRate} baud...`));

    this.port = new SerialPort({
      path: this.portPath,
      baudRate: this.baudRate,
      autoOpen: false,
    });

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

    this.port.open((err) => {
      if (err) {
        console.log(chalk.red(`  [SERIAL] Failed to open: ${err.message}`));
        this.scheduleReconnect();
        return;
      }

      console.log(chalk.green(`  [SERIAL] Connected successfully!`));
      console.log(chalk.gray(`  [SERIAL] Listening for sensor data...\n`));
      this.reconnecting = false;
    });

    this.parser.on('data', (line) => {
      this.handleLine(line.trim());
    });

    this.port.on('error', (err) => {
      console.log(chalk.red(`  [SERIAL] Error: ${err.message}`));
    });

    this.port.on('close', () => {
      console.log(chalk.yellow(`  [SERIAL] Port closed`));
      this.scheduleReconnect();
    });
  }

  handleLine(line) {
    if (!line) return;

    console.log(chalk.gray(`  [RAW] ${line}`));

    const parts = line.split(':');

    if (parts.length < 3) {
      console.log(chalk.yellow(`  [PARSE] Unknown format: ${line}`));
      return;
    }

    const messageType = parts[0].toUpperCase();

    // Registration message: REG:<zone_id>:<sensor_type>:<zone_name>:<device_name>
    // Example: REG:1:HALL:Front Door:ESP32-Main
    if (messageType === 'REG') {
      const zoneId = parseInt(parts[1], 10);
      const sensorType = parts[2].toLowerCase();
      const zoneName = parts[3] || `Zone ${zoneId}`;
      const deviceName = parts[4] || null;

      if (isNaN(zoneId)) {
        console.log(chalk.yellow(`  [PARSE] Invalid zone ID in REG: ${parts[1]}`));
        return;
      }

      this.zoneNames[zoneId] = zoneName;
      if (deviceName) this.deviceNames[zoneId] = deviceName;

      console.log(chalk.cyan.bold(`  [REG] Zone ${zoneId} registered: "${zoneName}" (${sensorType}) ${deviceName ? `[${deviceName}]` : ''}`));

      // Send registration as a special event so the API creates/updates the zone
      this.onEvent({
        sensor_type: sensorType,
        zone_id: zoneId,
        zone_name: zoneName,
        device_name: deviceName,
        event_type: 'register',
      });
      return;
    }

    const zoneId = parseInt(parts[1], 10);

    if (isNaN(zoneId)) {
      console.log(chalk.yellow(`  [PARSE] Invalid zone ID: ${parts[1]}`));
      return;
    }

    const zoneName = this.zoneNames[zoneId] || `Zone ${zoneId}`;
    const deviceName = this.deviceNames[zoneId] || null;
    let event;

    // Sensor data: HALL:<zone_id>:<state>
    // Example: HALL:1:OPEN, HALL:1:CLOSED
    if (messageType === 'HALL') {
      const state = parts[2].toLowerCase();
      event = {
        sensor_type: 'hall',
        zone_id: zoneId,
        zone_name: zoneName,
        device_name: deviceName,
        event_type: state,
      };

      if (state === 'open') {
        console.log(chalk.red.bold(`  [ALERT] ${zoneName} (Zone ${zoneId}) OPENED!`));
      } else {
        console.log(chalk.green(`  [OK] ${zoneName} (Zone ${zoneId}) closed`));
      }

    // Ultrasonic data: ULTRA:<zone_id>:DIST:<distance_cm>
    // Example: ULTRA:5:DIST:45
    } else if (messageType === 'ULTRA') {
      const distance = parseInt(parts[3], 10);
      const triggered = distance < 30;

      event = {
        sensor_type: 'ultrasonic',
        zone_id: zoneId,
        zone_name: zoneName,
        device_name: deviceName,
        event_type: triggered ? 'triggered' : 'clear',
        value: String(distance),
      };

      if (triggered) {
        console.log(chalk.red.bold(`  [ALERT] ${zoneName} (Zone ${zoneId}) proximity: ${distance}cm`));
      } else {
        console.log(chalk.blue(`  [DIST] ${zoneName} (Zone ${zoneId}): ${distance}cm`));
      }
    } else {
      console.log(chalk.yellow(`  [PARSE] Unknown sensor type: ${messageType}`));
      return;
    }

    this.onEvent(event);
  }

  scheduleReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    console.log(chalk.yellow(`  [SERIAL] Reconnecting in 5s...`));
    setTimeout(() => this.connect(), 5000);
  }

  disconnect() {
    if (this.port && this.port.isOpen) {
      this.port.close();
    }
  }
}

export async function listPorts() {
  const ports = await SerialPort.list();
  return ports;
}
