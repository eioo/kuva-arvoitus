import * as ws from 'ws';

export interface IWebSocketExtended extends ws {
  id: string;
  roomName: string;
  drawPath: IDrawPath;
}

interface IDrawPath {
  points: Array<[number, number]>;
  strokeWidth: number;
  strokeColor: string;
}

export interface IGameRooms {
  [key: string]: {
    clients: IWebSocketExtended[];
    drawPaths: IDrawPath[];
  };
}
