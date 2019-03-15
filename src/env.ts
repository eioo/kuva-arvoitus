import * as dotenv from 'dotenv';

dotenv.config({
  path: '../.env',
});

export const config = {
  webSocket: {
    host: process.env.WEBSOCKET_HOST || '127.0.0.1',
    port: Number(process.env.WEBSOCKET_PORT) || 8080,
  },
};
