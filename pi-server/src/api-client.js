import chalk from 'chalk';

export class ApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async sendEvent(payload) {
    try {
      const res = await fetch(`${this.baseUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.log(chalk.red(`  [API] Error: ${res.status} - ${err}`));
        return false;
      }

      console.log(chalk.green(`  [API] Event sent successfully`));
      return true;
    } catch (err) {
      console.log(chalk.red(`  [API] Connection failed: ${err.message}`));
      return false;
    }
  }

  async sendHeartbeat() {
    try {
      const res = await fetch(`${this.baseUrl}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (!res.ok) {
        console.log(chalk.yellow(`  [HEARTBEAT] Failed: ${res.status}`));
        return false;
      }

      console.log(chalk.gray(`  [HEARTBEAT] OK - ${new Date().toLocaleTimeString()}`));
      return true;
    } catch (err) {
      console.log(chalk.red(`  [HEARTBEAT] Connection failed: ${err.message}`));
      return false;
    }
  }

  startHeartbeat(intervalMs) {
    this.sendHeartbeat();
    this._heartbeatTimer = setInterval(() => this.sendHeartbeat(), intervalMs);
  }

  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
    }
  }
}
