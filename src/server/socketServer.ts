import * as WebSocket from 'ws';
import { config } from '../env';
import { SocketEvent } from '../socketEvents';

class SocketServer {
  public wss: WebSocket.Server;

  constructor() {
    this.create();
  }

  public create() {
    this.wss = new WebSocket.Server({
      port: config.webSocket.port,
    });

    this.wss.on('connection', ws => {
      console.log(`Socket connected (${this.wss.clients.size})`);

      ws.on('message', (data: string) => {
        const json = JSON.parse(data);
        const [event, ...values] = json;

        if (event === SocketEvent.beginPath) {
          const [x, y, strokeWidth, strokeColor] = values;
          return this.broadcast(ws, SocketEvent.beginPath, [
            x,
            y,
            strokeWidth,
            strokeColor,
          ]);
        }

        if (event === SocketEvent.drawPath) {
          return this.broadcast(ws, SocketEvent.drawPath, values);
        }

        if (event === SocketEvent.clearCanvas) {
          return this.broadcast(ws, SocketEvent.clearCanvas);
        }
      });

      ws.on('close', () => {
        console.log(`Socket disconnected (${this.wss.clients.size})`);
      });
    });

    console.log('WebSocket server running on port ' + config.webSocket.port);
  }

  public emit(ws: WebSocket, event: SocketEvent, data: any[]) {
    const json = JSON.stringify([event, ...data]);
    ws.send(json);
  }

  private broadcast(self: WebSocket, event: SocketEvent, data?: any[]) {
    data = data ? data : [];
    const json = JSON.stringify([event, ...data]);

    this.wss.clients.forEach(client => {
      if (client !== self && client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }
}

export default SocketServer;
