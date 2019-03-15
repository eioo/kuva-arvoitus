import * as uuid from 'uuid';
import * as WebSocket from 'ws';
import { config } from '../env';
import { SocketEvent } from '../socketEvents';
import { IGameRooms, IWebSocketExtended } from '../types';
import { logger } from './utils/logger';

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

          this.send(ws, SocketEvent.drawPath, this.rooms[roomName].drawPaths);
          ws.roomName = roomName;
          this.rooms[roomName].clients.push(ws);

          this.sendToAllInRoom(
            ws,
            SocketEvent.roomUserCount,
            this.rooms[roomName].clients.length
          );
        }

        if (event === SocketEvent.beginPath) {
          const [x, y, strokeWidth, strokeColor] = values;

          this.broadcastToRoom(ws, SocketEvent.beginPath, [
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
          if (!ws.drawPath || !ws.drawPath.points) {
            return;
          }

          this.rooms[ws.roomName] &&
            this.rooms[ws.roomName].drawPaths.push(ws.drawPath);
        }

        if (event === SocketEvent.drawPath) {
          if (!ws.drawPath) {
            return;
          }

          const [drawPath] = values;

          ws.drawPath.points.push(drawPath);
          return this.broadcastToRoom(ws, SocketEvent.drawPath, drawPath);
        }

        if (event === SocketEvent.clearCanvas) {
          this.rooms[ws.roomName].drawPaths = [];
          return this.broadcastToRoom(ws, SocketEvent.clearCanvas);
        }
      });

      ws.on('close', () => {
        if (ws.drawPath && ws.drawPath.points.length) {
          this.rooms[ws.roomName].drawPaths.push(ws.drawPath);
        }

        if (this.rooms[ws.roomName]) {
          this.rooms[ws.roomName].clients = this.rooms[
            ws.roomName
          ].clients.filter(client => client.id !== ws.id);

          this.sendToAllInRoom(
            ws,
            SocketEvent.roomUserCount,
            this.rooms[ws.roomName].clients.length
          );

          if (!this.rooms[ws.roomName].clients.length) {
            delete this.rooms[ws.roomName];
          }
        }

        logger.log(`Socket disconnected\t(${this.wss.clients.size})\t${ws.id}`);
      });
    });

    logger.log('WebSocket server running on port ' + config.webSocket.port);
  }

  public send(ws: IWebSocketExtended, event: SocketEvent, ...data: any) {
    data = Array.isArray(data) ? data : [data];
    const json = JSON.stringify([event, ...data]);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  }

  public sendToAllInRoom(
    ws: IWebSocketExtended,
    event: SocketEvent,
    ...data: any
  ) {
    data = Array.isArray(data) ? data : [data];
    const json = JSON.stringify([event, ...data]);
    const room = this.rooms[ws.roomName];

    if (!room) {
      return;
    }

    room.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }

  private broadcastToRoom(
    sender: IWebSocketExtended,
    event: SocketEvent,
    ...data: any
  ) {
    data = Array.isArray(data) ? data : [data];
    const room = this.rooms[sender.roomName];

    if (!room) {
      return;
    }

    const json = JSON.stringify([event, ...data]);

    room.clients.forEach(client => {
      if (client.id !== sender.id && client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }
}

export default SocketServer;
