export function fireEvent(el: Element, type: string) {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
}

export function escapeHtml(str: string): string {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function simulateClick(el: Element) {
  for (const type of ['mousedown', 'mouseup', 'click'] as const) {
    el.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true, view: window }),
    );
  }
}
