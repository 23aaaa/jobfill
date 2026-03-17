import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarHeaderProps {
  hideContent: boolean;
  onTogglePrivacy: () => void;
  onJumpNext: () => void;
  onClose: () => void;
}

export function SidebarHeader({
  hideContent,
  onTogglePrivacy,
  onJumpNext,
  onClose,
}: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-ts-primary text-ts-text-on-primary shrink-0">
      <span className="text-base font-bold tracking-wider">烫水-网申秋招工具</span>

      <div className="flex items-center gap-2.5">
        <Button variant="header" size="sm" onClick={onJumpNext}>
          下一个
        </Button>

        <label
          className={cn(
            'flex items-center gap-1 text-xs cursor-pointer opacity-90 select-none',
            'text-ts-text-on-primary',
          )}
        >
          <input
            type="checkbox"
            checked={!hideContent}
            onChange={onTogglePrivacy}
            className="w-3.5 h-3.5 cursor-pointer accent-white"
          />
          <span>{hideContent ? '已隐藏' : '显示'}</span>
        </label>

        <Button variant="icon" size="icon" onClick={onClose} className="text-xl leading-none">
          &times;
        </Button>
      </div>
    </div>
  );
}
