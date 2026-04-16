#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { config } from './config.js';
import { SerialReader, listPorts } from './serial.js';
import { ApiClient } from './api-client.js';
import { HttpReceiver } from './http-server.js';

function printBanner() {
  const banner = figlet.textSync('EZShield', {
    font: 'ANSI Shadow',
    horizontalLayout: 'fitted',
  });

  console.log(chalk.yellow(banner));
  console.log(chalk.blue.bold('  ╔══════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('  ║') + chalk.white.bold('   Home Security Collector Service v2.0          ') + chalk.blue.bold('║'));
  console.log(chalk.blue.bold('  ║') + chalk.gray('   Modes: Serial (USB) | WiFi (ESP-01 HTTP)      ') + chalk.blue.bold('║'));
  console.log(chalk.blue.bold('  ╚══════════════════════════════════════════════════╝'));
  console.log();

  const shield = [
    '         ████████████',
    '       ██            ██',
    '      ██   ██████████ ██',
    '      ██   ██      ██ ██',
    '      ██   ██████████ ██',
    '      ██   ██         ██',
    '       ██  ██        ██',
    '        ██  ██      ██',
    '          ██  ██  ██',
    '            ██████',
    '              ██',
  ];

  shield.forEach(line => console.log(chalk.yellow(line)));
  console.log();
}

program
  .name('ezshield')
  .description('EZShield Raspberry Pi collector — serial + WiFi')
  .version('2.0.0')
  .option('-m, --mode <mode>', 'Input mode: "serial", "wifi", or "both"', 'both')
  .option('-p, --port <path>', 'Serial port path (serial/both mode)', config.serialPort)
  .option('-b, --baud <rate>', 'Baud rate (serial/both mode)', String(config.baudRate))
  .option('-w, --http-port <port>', 'HTTP listen port for ESP WiFi modules (wifi/both mode)', '8266')
  .option('-u, --api-url <url>', 'API base URL (Vercel app)', config.apiUrl)
  .option('-k, --api-key <key>', 'API authentication key', config.apiKey)
  .option('-l, --list-ports', 'List available serial ports and exit')
  .option('--no-heartbeat', 'Disable heartbeat pings');

program.parse();
const opts = program.opts();

async function main() {
  printBanner();

  if (opts.listPorts) {
    console.log(chalk.cyan('  Available serial ports:\n'));
    const ports = await listPorts();
    if (ports.length === 0) {
      console.log(chalk.yellow('  No serial ports found.'));
    } else {
      ports.forEach(p => {
        console.log(chalk.white(`  ${p.path}`) + chalk.gray(` - ${p.manufacturer || 'Unknown'}`));
      });
    }
    process.exit(0);
  }

  const mode = opts.mode;
  const apiUrl = opts.apiUrl;
  const apiKey = opts.apiKey;

  console.log(chalk.cyan('  Configuration:'));
  console.log(chalk.white(`    Mode:         ${mode}`));
  if (mode === 'serial' || mode === 'both') {
    console.log(chalk.white(`    Serial Port:  ${opts.port}`));
    console.log(chalk.white(`    Baud Rate:    ${opts.baud}`));
  }
  if (mode === 'wifi' || mode === 'both') {
    console.log(chalk.white(`    HTTP Port:    ${opts.httpPort}`));
  }
  console.log(chalk.white(`    API URL:      ${apiUrl}`));
  console.log(chalk.white(`    API Key:      ${apiKey ? '****' + apiKey.slice(-4) : 'NOT SET'}`));
  console.log(chalk.white(`    Heartbeat:    ${opts.heartbeat ? 'Enabled (30s)' : 'Disabled'}`));
  console.log();

  if (!apiKey) {
    console.log(chalk.red.bold('  WARNING: No API key set. Events will be rejected by the server.'));
    console.log(chalk.red('  Set via --api-key flag or API_KEY env variable.\n'));
  }

  const api = new ApiClient(apiUrl, apiKey);

  if (opts.heartbeat) {
    api.startHeartbeat(config.heartbeatInterval);
  }

  const handleEvent = async (event) => {
    await api.sendEvent(event);
  };

  // Start serial listener
  let serial = null;
  if (mode === 'serial' || mode === 'both') {
    serial = new SerialReader(opts.port, parseInt(opts.baud, 10), handleEvent);
    serial.connect();
  }

  // Start HTTP listener for ESP-01 WiFi modules
  let httpReceiver = null;
  if (mode === 'wifi' || mode === 'both') {
    httpReceiver = new HttpReceiver(parseInt(opts.httpPort, 10), apiKey, handleEvent);
    httpReceiver.start();
  }

  // Graceful shutdown
  const shutdown = () => {
    console.log(chalk.yellow('\n  Shutting down EZShield...'));
    api.stopHeartbeat();
    if (serial) serial.disconnect();
    if (httpReceiver) httpReceiver.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(chalk.red(`\n  Fatal error: ${err.message}`));
  process.exit(1);
});
