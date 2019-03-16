import * as uuid from 'uuid';
import * as WebSocket from 'ws';
import { config } from '../env';
import { SocketEvent } from '../socketEvents';
import { IGameRooms, IPlayer, IWebSocketExtended } from '../types';
import { logger } from './utils/logger';

class SocketServer {
  public wss: WebSocket.Server;
  private rooms: IGameRooms = {};

  constructor() {
    this.create();
  }

  private create() {
    this.wss = new WebSocket.Server({
      port: config.webSocket.port,
    });

    this.wss.on('connection', (ws: IWebSocketExtended) => {
      ws.id = uuid.v4();
      ws.score = 0;
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
            this.createRoom(roomName);
          }

          if (this.rooms[roomName].drawPaths.length) {
            this.send(ws, SocketEvent.drawPath, this.rooms[roomName].drawPaths);
          }

          ws.roomName = roomName;
          this.rooms[roomName].clients.push(ws.id);

          const playerList = this.getRoomPlayerList(ws);
          return this.send(ws, SocketEvent.roomPlayers, playerList);
        }

        if (event === SocketEvent.setPlayerName) {
          const [playerName] = values;

          if (!playerName || !ws.roomName || ws.playerName) {
            return;
          }

          ws.playerName = playerName;
          return this.sendPlayerListToRoom(ws);
        }

        if (event === SocketEvent.chatMessage) {
          const text = values;

          this.broadcastToRoom(
            ws,
            SocketEvent.chatMessage,
            text,
            ws.playerName
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
          this.removeClientFromRoom(ws);
        }

        logger.log(`Socket disconnected\t(${this.wss.clients.size})\t${ws.id}`);
      });
    });

    logger.log('WebSocket server running on port ' + config.webSocket.port);
  }

  private getRoomPlayerList(ws: IWebSocketExtended) {
    const players: IPlayer[] = this.getRoomClients(ws.roomName)
      .filter(client => client.playerName)
      .map(client => {
        return {
          name: client.playerName,
          score: client.score,
        };
      });

    return players;
  }

  private sendPlayerListToRoom(ws: IWebSocketExtended) {
    const players = this.getRoomPlayerList(ws);
    this.sendToAllInRoom(ws, SocketEvent.roomPlayers, players);
  }

  private getRoomClients(roomName: string): IWebSocketExtended[] {
    const allClients = Array.from(this.wss.clients) as IWebSocketExtended[];
    return allClients.filter(client => client.roomName === roomName);
  }

  private removeClientFromRoom(ws: IWebSocketExtended) {
    const filtered = this.rooms[ws.roomName].clients.filter(
      clientId => clientId !== ws.id
    );

    this.rooms[ws.roomName].clients = filtered;

    if (!this.rooms[ws.roomName].clients.length) {
      return this.deleteRoom(ws.roomName);
    }

    this.sendPlayerListToRoom(ws);
  }

  private createRoom(roomName: string) {
    this.rooms[roomName] = {
      clients: [],
      drawPaths: [],
    };
    logger.log(`Room created\t\t"${roomName}"`);
  }

  private deleteRoom(roomName: string) {
    delete this.rooms[roomName];
    logger.log(`Room deleted\t\t"${roomName}"`);
  }

  private send(ws: IWebSocketExtended, event: SocketEvent, ...data: any) {
    data = Array.isArray(data) ? data : [data];
    const json = JSON.stringify([event, ...data]);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  }

  private sendToAllInRoom(
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

    this.getRoomClients(ws.roomName).forEach(client => {
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

    this.getRoomClients(sender.roomName).forEach(client => {
      if (client.id !== sender.id && client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }
}

export default SocketServer;
