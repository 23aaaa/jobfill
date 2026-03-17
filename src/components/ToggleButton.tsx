import { useRef, useCallback, useState, useMemo, type MouseEvent as RMouseEvent } from 'react';

const BALL_SIZE = 36;
const ICON_SIZE = 22;
const PEEK_OFFSET = -14;
const VISIBLE_OFFSET = 4;

interface ToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ToggleButton({ onClick }: ToggleButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const draggedRef = useRef(false);
  const startPos = useRef({ y: 0, t: 0 });
  const [topPx, setTopPx] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);

  const iconUrl = useMemo(() => {
    try {
      return chrome.runtime.getURL('icons/icon-48.png');
    } catch {
      return '';
    }
  }, []);

  const handleMouseDown = useCallback((e: RMouseEvent) => {
    draggedRef.current = false;
    const btn = btnRef.current;
    if (!btn) return;
    e.preventDefault();

    const r = btn.getBoundingClientRect();
    startPos.current = { y: e.clientY, t: r.top };

    const onMove = (ev: globalThis.MouseEvent) => {
      const dy = ev.clientY - startPos.current.y;
      if (!draggedRef.current && Math.abs(dy) > 4) {
        draggedRef.current = true;
      }
      if (draggedRef.current) {
        const maxT = window.innerHeight - BALL_SIZE;
        const newTop = Math.max(0, Math.min(startPos.current.t + dy, maxT));
        setTopPx(newTop);
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const handleClick = useCallback(() => {
    if (draggedRef.current) return;
    onClick();
  }, [onClick]);

  const posStyle: React.CSSProperties = {
    position: 'fixed',
    right: hovered ? VISIBLE_OFFSET : PEEK_OFFSET,
    top: topPx ?? '50%',
    ...(topPx == null && { transform: 'translateY(-50%)' }),
    zIndex: 2147483646,
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.92)',
    boxShadow: hovered
      ? '0 2px 12px rgba(0,0,0,0.18)'
      : '0 1px 6px rgba(0,0,0,0.12)',
    opacity: hovered ? 1 : 0.7,
    transition: 'right 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease',
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    touchAction: 'none' as const,
  };

  return (
    <button
      ref={btnRef}
      style={posStyle}
      title="打开求职助手"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {iconUrl && (
        <img
          src={iconUrl}
          alt=""
          draggable={false}
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
      )}
    </button>
  );
}
