import { useRef, useCallback } from 'react';
import { useSidebarStore } from '@/stores/sidebar-store';

export function useInputScanner() {
  const inputsRef = useRef<HTMLElement[]>([]);
  const currentIndexRef = useRef(-1);
  const setMessage = useSidebarStore((s) => s.setMessage);

  const scanInputs = useCallback(() => {
    const root = document.getElementById('ts-root');

    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"])',
      ),
    );
    const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea'));
    const editables = Array.from(
      document.querySelectorAll<HTMLElement>('[contenteditable="true"]'),
    );

    inputsRef.current = [...inputs, ...textareas, ...editables].filter((el) => {
      if (root?.contains(el)) return false;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        s.visibility !== 'hidden' &&
        s.display !== 'none' &&
        !(el as HTMLInputElement).disabled &&
        !(el as HTMLInputElement).readOnly
      );
    }).sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return Math.abs(ra.top - rb.top) < 10
        ? ra.left - rb.left
        : ra.top - rb.top;
    });
  }, []);

  const jumpNext = useCallback((currentInput: HTMLElement | null): HTMLElement | null => {
    scanInputs();
    const list = inputsRef.current;
    if (list.length === 0) {
      setMessage('未找到可填写的输入框', 'warn');
      return null;
    }

    let idx = 0;
    if (currentInput) {
      const ci = list.indexOf(currentInput);
      if (ci !== -1) idx = (ci + 1) % list.length;
    }

    const next = list[idx];
    next.focus();
    next.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const primaryHighlight = getComputedStyle(document.documentElement)
      .getPropertyValue('--ts-primary-highlight')
      .trim();
    const orig = next.style.boxShadow;
    next.style.boxShadow = `0 0 0 3px ${primaryHighlight}`;
    setTimeout(() => (next.style.boxShadow = orig), 2000);

    currentIndexRef.current = idx;
    setMessage(`第 ${idx + 1}/${list.length} 个`, 'ok');
    return next;
  }, [scanInputs, setMessage]);

  return { jumpNext };
}
