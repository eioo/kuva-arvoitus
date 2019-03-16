export const $ = (selector: string) => document.querySelector(selector);
export const $all = (selector: string) =>
  Array.from(document.querySelectorAll(selector));

export function getMousePos(canvas: HTMLCanvasElement, ev: MouseEvent) {
  return [ev.pageX - canvas.offsetLeft, ev.pageY - canvas.offsetTop];
}

export function clickedInside(canvas: HTMLCanvasElement, ev: MouseEvent) {
  return (
    ev.pageX > canvas.offsetLeft &&
    ev.pageX < canvas.offsetLeft + canvas.width &&
    ev.pageY > canvas.offsetTop &&
    ev.pageY < canvas.offsetTop + canvas.height
  );
}

export function getRoomNameFromUrl() {
  const { pathname } = window.location;

  if (/^\/room\/[A-Za-z0-9]+$/.test(pathname)) {
    return pathname.substr(6);
  }

  return;
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
