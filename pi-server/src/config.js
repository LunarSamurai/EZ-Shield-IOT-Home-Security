import 'dotenv/config';

export const config = {
  serialPort: process.env.SERIAL_PORT || '/dev/ttyUSB0',
  baudRate: parseInt(process.env.BAUD_RATE || '9600', 10),
  httpPort: parseInt(process.env.HTTP_PORT || '8266', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
  apiKey: process.env.API_KEY || '',
  heartbeatInterval: 30000,
  reconnectDelay: 5000,
};
