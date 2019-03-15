import * as uuid from 'uuid';
import * as WebSocket from 'ws';
import { config } from '../env';
import { SocketEvent } from '../socketEvents';
import { IGameRooms, IWebSocketExtended } from '../types';

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
      console.log(`Socket connected\t(${this.wss.clients.size})\t${ws.id}`);

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
            points: [],
            strokeColor,
            strokeWidth,
          };

          return;
        }

        if (event === SocketEvent.endPath) {
          this.rooms[ws.room].drawPaths.push({
            points: ws.drawPath.points,
            strokeColor: ws.drawPath.strokeColor,
            strokeWidth: ws.drawPath.strokeWidth,
          });
        }

        if (event === SocketEvent.drawPath) {
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

        for (const [roomName, room] of Object.entries(this.rooms)) {
          this.rooms[roomName].clients = room.clients.filter(
            client => client.id !== ws.id
          );

          if (!this.rooms[roomName].clients.length) {
            delete this.rooms[roomName];
          }
        }

        console.log(
          `Socket disconnected\t(${this.wss.clients.size})\t${ws.id}`
        );
      });
    });

    console.log('WebSocket server running on port ' + config.webSocket.port);
  }

  public emit(ws: WebSocket, event: SocketEvent, data?: any) {
    data = data ? data : [];
    const json = JSON.stringify([event, ...data]);
    ws.send(json);
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
