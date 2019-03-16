import * as ws from 'ws';

export interface IWebSocketExtended extends ws {
  id: string;
  roomName: string;
  playerName: string;
  score: number;
  drawPath: IDrawPath;
}

export interface IPlayer {
  name: string;
  score: number;
}

interface IDrawPath {
  points: Array<[number, number]>;
  strokeWidth: number;
  strokeColor: string;
}

export interface IGameRooms {
  [key: string]: {
    clients: string[];
    drawPaths: IDrawPath[];
  };
}
