import * as uuid from 'uuid';
import * as WebSocket from 'ws';
import { config } from '../env';
import { SocketEvent } from '../socketEvents';
import { IGameRooms, IWebSocketExtended } from '../types';
import { logger } from './logger';

class SocketServer {
  public wss: WebSocket.Server;
  private rooms: IGameRooms = {};

  constructor() {
    this.create();
  }

  public create() {
    this.wss = new WebSocket.Server({
      port: config.webSocket.port,
    });

    this.wss.on('connection', (ws: IWebSocketExtended) => {
      ws.id = uuid.v4();

      this.sendToAll(SocketEvent.roomUserCount, this.wss.clients.size);
      logger.log(`Socket connected\t(${this.wss.clients.size})\t${ws.id}`);

      ws.on('message', (data: string) => {
        const json = JSON.parse(data);
        const [event, ...values] = json;

        if (event === SocketEvent.joinRoom) {
          const [roomName] = values;

          if (!roomName) {
            return;
          }

          if (!this.rooms[roomName]) {
            this.rooms[roomName] = {
              clients: [],
              drawPaths: [],
            };
          }

          for (const drawPath of this.rooms[roomName].drawPaths) {
            if (!drawPath.points.length) {
              return;
            }

            const [firstX, firstY] = drawPath.points[0];

            this.emit(ws, SocketEvent.beginPath, [
              firstX,
              firstY,
              drawPath.strokeWidth,
              drawPath.strokeColor,
            ]);

            this.emit(ws, SocketEvent.drawPath, drawPath.points);
          }

          ws.room = roomName;
          this.rooms[roomName].clients.push(ws);
        }

        if (event === SocketEvent.beginPath) {
          const [x, y, strokeWidth, strokeColor] = values;

          this.broadcast(ws, SocketEvent.beginPath, [
            x,
            y,
            strokeWidth,
            strokeColor,
          ]);

          ws.drawPath = {
            points: [[x, y]],
            strokeWidth,
            strokeColor,
          };

          return;
        }

        if (event === SocketEvent.endPath) {
          if (!ws.drawPath || !ws.drawPath.points || !this.rooms[ws.room]) {
            return;
          }

          this.rooms[ws.room].drawPaths.push(ws.drawPath);
        }

        if (event === SocketEvent.drawPath) {
          if (!ws.drawPath) {
            return;
          }

          ws.drawPath.points.push(values[0]);
          return this.broadcast(ws, SocketEvent.drawPath, values);
        }

        if (event === SocketEvent.clearCanvas) {
          this.rooms[ws.room].drawPaths = [];
          return this.broadcast(ws, SocketEvent.clearCanvas);
        }
      });

      ws.on('close', () => {
        this.sendToAll(SocketEvent.roomUserCount, this.wss.clients.size);

        if (ws.drawPath && ws.drawPath.points.length) {
          this.rooms[ws.room].drawPaths.push(ws.drawPath);
        }

        for (const [roomName, room] of Object.entries(this.rooms)) {
          this.rooms[roomName].clients = room.clients.filter(
            client => client.id !== ws.id
          );

          if (!this.rooms[roomName].clients.length) {
            delete this.rooms[roomName];
          }
        }

        logger.log(`Socket disconnected\t(${this.wss.clients.size})\t${ws.id}`);
      });
    });

    logger.log('WebSocket server running on port ' + config.webSocket.port);
  }

  public emit(ws: WebSocket, event: SocketEvent, data?: any) {
    data = data ? data : [];
    const json = JSON.stringify([event, ...data]);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  }

  public sendToAll(event: SocketEvent, data?: any) {
    data = data ? data : [];
    const json = JSON.stringify([event, ...data]);

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }

  private broadcast(self: WebSocket, event: SocketEvent, data?: any) {
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
