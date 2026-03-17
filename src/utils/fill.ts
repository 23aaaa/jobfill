import { fireEvent, simulateClick } from './dom';

function clearContent(el: HTMLElement) {
  if (el.isContentEditable) {
    el.textContent = '';
    el.innerHTML = '';
  } else {
    (el as HTMLInputElement).value = '';
  }
  fireEvent(el, 'input');
  fireEvent(el, 'change');
}

function setContent(el: HTMLElement, content: string) {
  if (el.isContentEditable) {
    el.textContent = content;
  } else {
    try {
      const setter = Object.getOwnPropertyDescriptor(
        el.constructor.prototype,
        'value',
      )?.set;
      if (setter) {
        setter.call(el, content);
      } else {
        (el as HTMLInputElement).value = content;
      }
    } catch {
      (el as HTMLInputElement).value = content;
    }
  }

  try {
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: content,
      }),
    );
  } catch {
    fireEvent(el, 'input');
  }
}

function fireEventSequence(el: HTMLElement) {
  fireEvent(el, 'compositionstart');

  for (const t of ['keydown', 'keypress', 'keyup'] as const) {
    el.dispatchEvent(
      new KeyboardEvent(t, {
        bubbles: true,
        cancelable: true,
        key: 'a',
        keyCode: 65,
        which: 65,
        view: window,
      }),
    );
  }

  fireEvent(el, 'compositionend');
  fireEvent(el, 'change');

  const v = el.isContentEditable ? el.textContent : (el as HTMLInputElement).value;
  el.dispatchEvent(
    new CustomEvent('ngModelChange', {
      bubbles: true,
      cancelable: true,
      detail: v,
    }),
  );
}

export function fillElement(el: HTMLElement, content: string): boolean {
  try {
    el.focus();
    simulateClick(el);
    clearContent(el);
    setContent(el, content);
    fireEventSequence(el);

    setTimeout(() => {
      el.blur();
      fireEvent(el, 'blur');
      fireEvent(el, 'focusout');
      setTimeout(() => {
        el.focus();
        fireEvent(el, 'focus');
        fireEvent(el, 'focusin');
        setTimeout(() => {
          fireEvent(el, 'input');
          fireEvent(el, 'change');
        }, 50);
      }, 100);
    }, 100);

    return true;
  } catch (err) {
    console.error('[烫水-网申秋招工具] 填写失败:', err);
    return fallbackFill(el, content);
  }
}

function fallbackFill(el: HTMLElement, content: string): boolean {
  try {
    el.focus();
    if (el.isContentEditable) {
      el.textContent = content;
    } else {
      (el as HTMLInputElement).value = content;
    }
    fireEvent(el, 'input');
    fireEvent(el, 'change');
    setTimeout(() => {
      el.blur();
      setTimeout(() => el.focus(), 100);
    }, 100);
    return true;
  } catch (err) {
    console.error('[烫水-网申秋招工具] 备用填充也失败:', err);
    return false;
  }
}

export function flashBorder(el: HTMLElement, color: string) {
  const orig = el.style.border;
  el.style.border = `2px solid ${color}`;
  setTimeout(() => (el.style.border = orig), 1000);
}
