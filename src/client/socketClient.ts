import { config } from '../env';
import { SocketEvent } from '../socketEvents';
import Game from './game';

class SocketClient {
  private ws: WebSocket;

  constructor(private game: Game) {
    this.create();
  }

  public emit(event: SocketEvent, data?: any[]) {
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

  private onMessage = (ev: MessageEvent) => {
    const { data } = ev;
    const [event, ...values] = JSON.parse(data);

    if (event === SocketEvent.beginPath) {
      const [x, y, strokeWidth, strokeColor] = values;
      return this.game.beginPath(x, y, strokeWidth, strokeColor);
    }

    if (event === SocketEvent.drawPath) {
      for (const point of values) {
        const [x, y] = point;
        this.game.drawLineTo(x, y);
      }
      return;
    }

    if (event === SocketEvent.clearCanvas) {
      return this.game.clearCanvas();
    }
  };

  private onOpen() {
    console.log('Socket connected');
  }

  private onClose = () => {
    console.log('Socket disconnected');

    setTimeout(() => {
      this.create();
    }, 500);
  };
}

export default SocketClient;
