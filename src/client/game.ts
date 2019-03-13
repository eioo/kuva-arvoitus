import { SocketEvent } from '../socketEvents';
import SocketClient from './socketClient';

const $ = (selector: string) => document.querySelector(selector);
const $all = (selector: string) =>
  Array.from(document.querySelectorAll(selector));

class Game {
  private socketClient: SocketClient;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private mouseDown = false;
  private dragPath: number[][] = [];
  private dragChunkSize = 1; // Max number of draw events to send at once
  private brush = {
    strokeWidth: 3,
    strokeColor: 'black',
  };

  constructor() {
    this.init();
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

  private init() {
    this.socketClient = new SocketClient(this);
    this.canvas = document.querySelector('canvas#game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.canvas.width = 800;
    this.canvas.height = 600;
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);

    this.buttonEventListeners();
  }

  private buttonEventListeners = () => {
    const strokeWidthRange = $('input#stroke-width') as HTMLButtonElement;
    const strokeColorBtns = $all('button.stroke-color') as HTMLButtonElement[];
    const clearButton = $('button#clear-canvas') as HTMLButtonElement;

    strokeWidthRange.addEventListener('change', () => {
      this.brush.strokeWidth = Number(strokeWidthRange.value) || 3;
    });

    strokeColorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.brush.strokeColor = btn.dataset.color || 'black';
      });
    });

    clearButton.addEventListener('click', () => {
      this.clearCanvas();
      this.socketClient.emit(SocketEvent.clearCanvas);
    });
  };

  private getMousePosition(ev: MouseEvent) {
    return [
      ev.pageX - this.canvas.offsetLeft,
      ev.pageY - this.canvas.offsetTop,
    ];
  }

  private handleMouseDown = (ev: MouseEvent) => {
    const [mouseX, mouseY] = this.getMousePosition(ev);
    const { strokeWidth, strokeColor } = this.brush;
    this.mouseDown = true;

    this.socketClient.emit(SocketEvent.beginPath, [
      mouseX,
      mouseY,
      strokeWidth,
      strokeColor,
    ]);

    this.beginPath(mouseX, mouseY, strokeWidth, strokeColor);
  };

  private handleMouseMove = (ev: MouseEvent) => {
    if (this.mouseDown) {
      const [mouseX, mouseY] = this.getMousePosition(ev);

      this.drawLineTo(mouseX, mouseY);
      this.dragPath.push([mouseX, mouseY]);

      if (this.dragPath.length >= this.dragChunkSize) {
        this.socketClient.emit(SocketEvent.drawPath, this.dragPath);
        this.dragPath = [];
      }
    }
  };

  private handleMouseUp = (ev: MouseEvent) => {
    this.mouseDown = false;

    if (this.dragPath.length > 0) {
      this.socketClient.emit(SocketEvent.drawPath, this.dragPath);
      this.dragPath = [];
    }
  };

  private handleMouseLeave = (ev: MouseEvent) => {
    if (this.mouseDown) {
      const [mouseX, mouseY] = this.getMousePosition(ev);
      this.mouseDown = false;
      this.drawLineTo(mouseX, mouseY);

      this.dragPath.push([mouseX, mouseY]);
      this.socketClient.emit(SocketEvent.drawPath, this.dragPath);
      this.dragPath = [];
    }
  };
}

export default Game;
