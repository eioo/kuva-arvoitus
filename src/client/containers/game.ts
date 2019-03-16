import { SocketEvent } from '../../socketEvents';
import App from '../app';
import SocketClient from '../socketClient';
import {
  $,
  $all,
  capitalize,
  clickedInside,
  getMousePos,
  getRoomNameFromUrl,
} from '../utils';

class GameContainer {
  public ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  private mouseDown = false;
  private prevMousePos: number[] = [];
  private dragPath: number[][] = [];
  private dragChunkSize = 1; // Max number of draw events to send at once
  private brush = {
    strokeWidth: 3,
    strokeColor: 'black',
  };

  constructor(private app: App) {}

  public show() {
    const roomNameEl = $('#room-name') as HTMLSpanElement;
    const gameContainerEl = $('.game-container') as HTMLDivElement;
    const roomName = getRoomNameFromUrl();

    if (roomName) {
      gameContainerEl.style.display = 'grid';
      roomNameEl.textContent = capitalize(roomName);
      this.init();
    }
  }

  public beginPath(
    x: number,
    y: number,
    strokeWidth: number,
    strokeColor: string
  ) {
    this.ctx.beginPath();
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.lineWidth = strokeWidth;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  public drawLineTo(x: number, y: number) {
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  public clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public setRoomUserCount(count: number) {
    const roomUserCountEl = $('#room-user-count') as HTMLSpanElement;
    roomUserCountEl.textContent = count.toString();
  }

  private init() {
    this.canvas = document.querySelector('canvas#game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.canvas.width = 800;
    this.canvas.height = 600;
    document.body.addEventListener('mousedown', this.handleMouseDown);
    document.body.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('mouseenter', this.handleMouseEnter);

    this.prepareElements();
  }

  private prepareElements = () => {
    const strokeWidthRange = $('input#stroke-width') as HTMLInputElement;
    const currentColorEl = $('.current-color') as HTMLDivElement;
    const strokeColorElAll = $all('.palette .color') as HTMLDivElement[];
    const clearButton = $('button#clear-canvas') as HTMLButtonElement;

    strokeWidthRange.addEventListener('change', () => {
      this.brush.strokeWidth = Number(strokeWidthRange.value) || 3;
    });

    strokeColorElAll.forEach(div => {
      div.addEventListener('click', () => {
        this.brush.strokeColor = div.dataset.color || 'black';
        currentColorEl.style.background = this.brush.strokeColor;
      });
    });

    clearButton.addEventListener('click', () => {
      this.clearCanvas();
      this.app.socket.emit(SocketEvent.clearCanvas);
    });
  };

  private handleMouseDown = (ev: MouseEvent) => {
    if (!clickedInside(this.canvas, ev)) {
      return;
    }

    const [mouseX, mouseY] = getMousePos(this.canvas, ev);
    const { strokeWidth, strokeColor } = this.brush;
    this.mouseDown = true;

    this.app.socket.emit(SocketEvent.beginPath, [
      mouseX,
      mouseY,
      strokeWidth,
      strokeColor,
    ]);

    this.beginPath(mouseX, mouseY, strokeWidth, strokeColor);
  };

  private handleMouseUp = (ev: MouseEvent) => {
    this.mouseDown = false;
    this.app.socket.emit(SocketEvent.endPath);
    this.dragPath = [];
  };

  private handleBodyMouseMove = (ev: MouseEvent) => {
    if (!this.mouseDown) {
      return;
    }

    const [mouseX, mouseY] = getMousePos(this.canvas, ev);
    this.prevMousePos = [mouseX, mouseY];
  };

  private handleCanvasMouseMove = (ev: MouseEvent) => {
    if (!this.mouseDown) {
      return;
    }

    if (ev.which !== 1) {
      return this.handleMouseUp(ev);
    }

    const [mouseX, mouseY] = getMousePos(this.canvas, ev);

    this.ctx.lineTo(mouseX, mouseY);
    this.ctx.stroke();
    this.dragPath.push([mouseX, mouseY]);

    if (this.dragPath.length >= this.dragChunkSize) {
      this.app.socket.emit(SocketEvent.drawPath, this.dragPath);
      this.dragPath = [];
    }
  };

  private handleMouseLeave = (ev: MouseEvent) => {
    if (!this.mouseDown) {
      return;
    }

    const [mouseX, mouseY] = getMousePos(this.canvas, ev);

    document.body.addEventListener('mousemove', this.handleBodyMouseMove);

    this.ctx.lineTo(mouseX, mouseY);
    this.ctx.stroke();

    this.dragPath.push([mouseX, mouseY]);
    this.app.socket.emit(SocketEvent.drawPath, this.dragPath);
    this.app.socket.emit(SocketEvent.endPath);
    this.dragPath = [];
  };

  private handleMouseEnter = (ev: MouseEvent) => {
    if (!this.mouseDown) {
      return;
    }

    const [mouseX, mouseY] = this.prevMousePos;
    const { strokeWidth, strokeColor } = this.brush;

    document.body.removeEventListener('mousemove', this.handleBodyMouseMove);
    this.app.socket.emit(SocketEvent.beginPath, [
      mouseX,
      mouseY,
      strokeWidth,
      strokeColor,
    ]);
    this.beginPath(mouseX, mouseY, strokeWidth, strokeColor);
  };
}

export default GameContainer;
