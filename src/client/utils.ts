export function getMousePos(canvas: HTMLCanvasElement, ev: MouseEvent) {
  return [ev.pageX - canvas.offsetLeft, ev.pageY - canvas.offsetTop];
}

export function getRoomNameFromUrl() {
  const { pathname } = window.location;

  if (/^\/room\/[A-Za-z0-9]+$/.test(pathname)) {
    return pathname.substr(6);
  }

  return;
}
