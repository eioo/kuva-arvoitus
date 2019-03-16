import { SocketEvent } from '../../socketEvents';
import App from '../app';
import { $ } from '../utils';

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

  public prepareElements() {
    const joinRoomInput = $('input#join-room-name') as HTMLInputElement;
    const joinRoomButton = $('button#join-room') as HTMLButtonElement;

    joinRoomInput.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') {
        this.joinRoom(joinRoomInput.value);
      }
    });

    joinRoomButton.addEventListener('click', () => {
      this.joinRoom(joinRoomInput.value);
    });
  }

  private joinRoom(roomName: string) {
    if (roomName === '') {
      return alert('Type room name');
    }

    if (roomName === undefined) {
      return alert('Can only contain A-Z, a-z, 0-9 and spaces.');
    }

    if (!this.app.socket.isConnected()) {
      return alert('Not connected to server');
    }

    this.app.socket.emit(SocketEvent.joinRoom, roomName);
    window.location.href = `/room/${roomName}`;
  }
}

export default JoinRoomContainer;
