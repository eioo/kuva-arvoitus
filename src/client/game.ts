import { SocketEvent } from '../socketEvents';
import SocketClient from './socketClient';
import {
  capitalize,
  clickedInside,
  getMousePos,
  getRoomNameFromUrl,
} from './utils';

const $ = (selector: string) => document.querySelector(selector);
const $all = (selector: string) =>
  Array.from(document.querySelectorAll(selector));

class Game {
  private socketClient: SocketClient;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private mouseDown = false;
  private prevMousePos: number[] = [];
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

  public setRoomUserCount(count: number) {
    const roomUserCountEl = $('#room-user-count') as HTMLSpanElement;
    roomUserCountEl.textContent = count.toString();
  }

  private init() {
    this.socketClient = new SocketClient(this);
    this.canvas = document.querySelector('canvas#game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.canvas.width = 800;
    this.canvas.height = 600;
    document.body.addEventListener('mousedown', this.handleMouseDown);
    document.body.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('mouseenter', this.handleMouseEnter);

    const roomName = getRoomNameFromUrl();

    if (roomName) {
      const roomNameEl = $('#room-name') as HTMLSpanElement;
      const gameContainerEl = $('.game-container') as HTMLDivElement;
      gameContainerEl.style.display = 'grid';
      roomNameEl.textContent = capitalize(roomName);
    } else {
      if (window.location.pathname !== '/') {
        window.location.href = '/';
        return;
      }

      const joinContainerEl = $('.join-container') as HTMLDivElement;
      joinContainerEl.style.display = 'grid';
    }

    this.prepareElements();
  }

  private prepareElements = () => {
    // Join room
    const joinRoomInput = $('input#join-room-name') as HTMLInputElement;
    const joinRoomButton = $('button#join-room') as HTMLButtonElement;

    // Game
    const strokeWidthRange = $('input#stroke-width') as HTMLInputElement;
    const currentColorEl = $('.current-color') as HTMLDivElement;
    const strokeColorElAll = $all('.palette .color') as HTMLDivElement[];
    const clearButton = $('button#clear-canvas') as HTMLButtonElement;

    joinRoomInput.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') {
        this.joinRoom(joinRoomInput.value);
      }
    });

    joinRoomButton.addEventListener('click', () => {
      this.joinRoom(joinRoomInput.value);
    });

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
      this.socketClient.emit(SocketEvent.clearCanvas);
    });
  };

  private joinRoom(roomName: string) {
    if (!/^[A-Za-z0-9]+$/.test(roomName)) {
      return alert('Can only contain A-Za-z0-9 and no spaces.');
    }

    window.location.href = `/room/${roomName}`;
  }

  private handleMouseDown = (ev: MouseEvent) => {
    if (!clickedInside(this.canvas, ev)) {
      return;
    }

    const [mouseX, mouseY] = getMousePos(this.canvas, ev);
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

  private handleMouseUp = (ev: MouseEvent) => {
    this.mouseDown = false;
    this.socketClient.emit(SocketEvent.endPath);
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

    this.drawLineTo(mouseX, mouseY);
    this.dragPath.push([mouseX, mouseY]);

    if (this.dragPath.length >= this.dragChunkSize) {
      this.socketClient.emit(SocketEvent.drawPath, this.dragPath);
      this.dragPath = [];
    }
  };

  private handleMouseLeave = (ev: MouseEvent) => {
    if (!this.mouseDown) {
      return;
    }

    const [mouseX, mouseY] = getMousePos(this.canvas, ev);

    document.body.addEventListener('mousemove', this.handleBodyMouseMove);
    this.drawLineTo(mouseX, mouseY);
    this.dragPath.push([mouseX, mouseY]);
    this.socketClient.emit(SocketEvent.drawPath, this.dragPath);
    this.socketClient.emit(SocketEvent.endPath);
    this.dragPath = [];
  };

  private handleMouseEnter = (ev: MouseEvent) => {
    if (!this.mouseDown) {
      return;
    }

    const [mouseX, mouseY] = this.prevMousePos;
    const { strokeWidth, strokeColor } = this.brush;

    document.body.removeEventListener('mousemove', this.handleBodyMouseMove);
    this.socketClient.emit(SocketEvent.beginPath, [
      mouseX,
      mouseY,
      strokeWidth,
      strokeColor,
    ]);
    this.beginPath(mouseX, mouseY, strokeWidth, strokeColor);
  };
}

export default Game;
