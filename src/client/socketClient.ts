import { config } from '../env';
import { SocketEvent } from '../socketEvents';
import Game from './game';
import { getRoomNameFromUrl, sleep } from './utils';

class SocketClient {
  private ws: WebSocket;

  constructor(private game: Game) {
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

    if (event === SocketEvent.beginPath) {
      const [x, y, strokeWidth, strokeColor] = values;
      return this.game.beginPath(x, y, strokeWidth, strokeColor);
    }

    if (event === SocketEvent.drawPath) {
      if (!values[0] || !values[0].points) {
        const [x, y] = values;
        return this.game.drawLineTo(x, y);
      }

      for (const drawPath of values) {
        const [startX, startY] = drawPath.points[0];
        this.game.beginPath(
          startX,
          startY,
          drawPath.strokeWidth,
          drawPath.strokeColor
        );

        let counter = 0;

        while (drawPath.points.length) {
          const [x, y] = drawPath.points.shift();
          this.game.ctx.lineTo(x, y);

          counter++;

          if (counter % 20 === 0) {
            this.game.ctx.stroke();
            await sleep(10);
          }
        }

        this.game.ctx.stroke();
      }
      return;
    }

    if (event === SocketEvent.clearCanvas) {
      this.game.clearCanvas();
      return;
    }

    if (event === SocketEvent.roomUserCount) {
      const count = values;
      this.game.setRoomUserCount(count);
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
