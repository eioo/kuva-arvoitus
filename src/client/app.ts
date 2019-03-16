import GameContainer from './containers/game';
import JoinRoomContainer from './containers/joinRoom';
import SocketClient from './socketClient';
import { getRoomNameFromUrl } from './utils';

class App {
  public game: GameContainer;
  public joinRoom: JoinRoomContainer;
  public socket: SocketClient;
  public isPlaying = false;

  constructor() {
    this.game = new GameContainer(this);
    this.joinRoom = new JoinRoomContainer(this);
    this.socket = new SocketClient(this);

    this.router();
  }

  private router() {
    const roomName = getRoomNameFromUrl();

    if (roomName) {
      this.game.show();
      return;
    }

    if (window.location.pathname !== '/') {
      window.location.href = '/';
      return;
    }

    this.joinRoom.show();
  }
}

new App();
export default App;
