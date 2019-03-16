import { SocketEvent } from '../../socketEvents';
import App from '../app';
import { $, setUrlPath } from '../utils';

class JoinRoomContainer {
  constructor(private app: App) {
    this.prepareElements();
  }

  public show() {
    const joinRoomInput = $('input#join-room-name') as HTMLInputElement;
    const joinContainerEl = $('.join-container') as HTMLDivElement;
    joinContainerEl.style.display = 'grid';
    joinRoomInput.focus();
  }

  public hide() {
    const joinContainerEl = $('.join-container') as HTMLDivElement;
    joinContainerEl.style.display = 'none';
  }

  public prepareElements() {
    const joinRoomInput = $('input#join-room-name') as HTMLInputElement;
    const playerNameInput = $('input#join-player-name') as HTMLInputElement;
    const joinRoomButton = $('button#join-room') as HTMLButtonElement;

    const joinOnEnterKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        this.joinRoom(joinRoomInput.value, playerNameInput.value);
      }
    };

    joinRoomInput.addEventListener('keydown', joinOnEnterKey);
    playerNameInput.addEventListener('keydown', joinOnEnterKey);

    joinRoomButton.addEventListener('click', () => {
      this.joinRoom(joinRoomInput.value, playerNameInput.value);
    });
  }

  private joinRoom(roomName: string, playerName: string) {
    roomName = roomName.trim();
    playerName = playerName.trim();

    if (!this.app.socket.isConnected()) {
      return alert('Not connected to server');
    }

    if (roomName === '') {
      return alert('Please enter room name');
    }

    if (roomName === undefined) {
      return alert('Can only contain A-Z, a-z, 0-9 and spaces.');
    }

    if (playerName === '') {
      return alert('Please enter your name');
    }

    if (playerName.length > 16) {
      return alert('Sorry bud, 16 is max length for your name');
    }

    this.app.socket.emit(SocketEvent.joinRoom, roomName);
    this.app.game.setPlayerName(playerName);

    setUrlPath(`/room/${roomName}`);
    this.hide();
    this.app.game.show();
  }
}

export default JoinRoomContainer;
