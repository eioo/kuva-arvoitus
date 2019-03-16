import { config } from '../env';
import { SocketEvent } from '../socketEvents';
import { IPlayer } from '../types';
import App from './app';
import { getRoomNameFromUrl, sleep } from './utils';

class SocketClient {
  private ws: WebSocket;
  private redrawSpeed = 10; // Speed of "redraw" when joining a room, higher = faster

  constructor(private app: App) {
    this.create();
  }

  public isConnected() {
    return this.ws.readyState === this.ws.OPEN;
  }

  public emit(event: SocketEvent, data?: any) {
    data = data ? data : [];
    const json = JSON.stringify([event, ...data]);
    this.ws.send(json);
  }

  private create() {
    this.ws = new WebSocket(
      `ws://${config.webSocket.host}:${config.webSocket.port}`
    );

    this.ws.onopen = this.onOpen;
    this.ws.onclose = this.onClose;
    this.ws.onmessage = this.onMessage;
  }

  private onMessage = async (ev: MessageEvent) => {
    const { data } = ev;
    const [event, values] = JSON.parse(data);

    if (event === SocketEvent.chatMessage) {
      const [text, playerName] = values;
      console.log(values);

      if (!text || !playerName) {
        return;
      }

      this.app.game.addChatMessage(text, playerName);
    }

    if (event === SocketEvent.beginPath) {
      const [x, y, strokeWidth, strokeColor] = values;
      return this.app.game.beginPath(x, y, strokeWidth, strokeColor);
    }

    if (event === SocketEvent.drawPath) {
      // Draw singular point
      if (!values[0] || !values[0].points) {
        const [x, y] = values;
        return x && y && this.app.game.drawLineTo(x, y);
      }

      // Draw array of points
      for (const drawPath of values) {
        const [startX, startY] = drawPath.points[0];
        this.app.game.beginPath(
          startX,
          startY,
          drawPath.strokeWidth,
          drawPath.strokeColor
        );

        let counter = 0;

        while (drawPath.points.length) {
          const [x, y] = drawPath.points.shift();
          this.app.game.ctx.lineTo(x, y);

          counter++;

          if (counter % this.redrawSpeed === 0) {
            this.app.game.ctx.stroke();
            await sleep(10);
          }
        }

        this.app.game.ctx.stroke();
      }
      return;
    }

    if (event === SocketEvent.clearCanvas) {
      this.app.game.clearCanvas();
      return;
    }

    if (event === SocketEvent.roomPlayers) {
      const players: IPlayer[] = values;
      this.app.game.setRoomPlayers(players);
    }
  };

  private onOpen = () => {
    console.log('Socket connected');
    const roomName = getRoomNameFromUrl();

    if (roomName) {
      this.emit(SocketEvent.joinRoom, roomName);
    }
  };

  private onClose = () => {
    console.log('Socket disconnected');

    setTimeout(() => {
      this.create();
    }, 500);
  };
}

export default SocketClient;
