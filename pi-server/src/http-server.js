import http from 'node:http';
import chalk from 'chalk';

export class HttpReceiver {
  constructor(port, apiKey, onEvent) {
    this.port = port;
    this.apiKey = apiKey;
    this.onEvent = onEvent;
    this.server = null;
  }

  start() {
    this.server = http.createServer(async (req, res) => {
      // CORS headers for ESP modules
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method not allowed');
        return;
      }

      // Verify API key
      const key = req.headers['x-api-key'];
      if (this.apiKey && key !== this.apiKey) {
        console.log(chalk.red(`  [HTTP] Unauthorized request from ${req.socket.remoteAddress}`));
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }

      // Read body
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      try {
        const event = JSON.parse(body);
        const ip = req.socket.remoteAddress;

        if (event.event_type === 'register') {
          console.log(chalk.cyan.bold(`  [HTTP] Zone ${event.zone_id} registered: "${event.zone_name || 'Unknown'}" from ${ip}`));
        } else if (event.sensor_type === 'hall') {
          if (event.event_type === 'open') {
            console.log(chalk.red.bold(`  [HTTP] Zone ${event.zone_id} OPENED! (from ${ip})`));
          } else {
            console.log(chalk.green(`  [HTTP] Zone ${event.zone_id} closed (from ${ip})`));
          }
        } else if (event.sensor_type === 'ultrasonic') {
          if (event.event_type === 'triggered') {
            console.log(chalk.red.bold(`  [HTTP] Zone ${event.zone_id} proximity: ${event.value}cm (from ${ip})`));
          } else {
            console.log(chalk.blue(`  [HTTP] Zone ${event.zone_id}: ${event.value}cm (from ${ip})`));
          }
        }

        await this.onEvent(event);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.log(chalk.red(`  [HTTP] Bad request: ${err.message}`));
        res.writeHead(400);
        res.end('Bad request');
      }
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(chalk.green(`  [HTTP] Listening on port ${this.port} for ESP modules`));
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}
