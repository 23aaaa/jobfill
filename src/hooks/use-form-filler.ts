import { useRef, useCallback } from 'react';
import { fillElement, flashBorder } from '@/utils/fill';
import { useSidebarStore } from '@/stores/sidebar-store';

export function useFormFiller() {
  const currentInputRef = useRef<HTMLElement | null>(null);
  const setMessage = useSidebarStore((s) => s.setMessage);

  const trackFocusedInput = useCallback((e: FocusEvent) => {
    const t = e.target as HTMLElement;
    if (!t) return;

    const tagName = t.tagName;
    if (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      t.isContentEditable
    ) {
      const root = document.getElementById('ts-root');
      if (!root?.contains(t)) {
        currentInputRef.current = t;
      }
    }
  }, []);

  const fill = useCallback((content: string) => {
    const el = currentInputRef.current;
    if (!el) {
      setMessage('请先点击网页上的输入框', 'warn');
      return;
    }

    const ok = fillElement(el, content);
    if (ok) {
      setMessage('已填写', 'ok');
      flashBorder(el, getComputedStyle(document.documentElement).getPropertyValue('--ts-primary').trim());
    } else {
      setMessage('填写失败', 'err');
    }
  }, [setMessage]);

  return { currentInputRef, trackFocusedInput, fill };
}
