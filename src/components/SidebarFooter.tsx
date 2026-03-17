import { cn } from '@/lib/utils';
import type { MsgType } from '@/stores/sidebar-store';

interface SidebarFooterProps {
  message: string;
  messageType: MsgType;
}

const MSG_COLORS: Record<string, string> = {
  ok: 'text-ts-success',
  warn: 'text-ts-warning',
  err: 'text-ts-error',
  loading: 'text-ts-text-secondary',
};

export function SidebarFooter({ message, messageType }: SidebarFooterProps) {
  return (
    <div className="px-3.5 py-2 border-t border-ts-border bg-ts-bg-section flex items-center justify-between shrink-0 min-h-[36px]">
      <span
        className={cn(
          'text-xs font-medium',
          messageType ? MSG_COLORS[messageType] : 'text-transparent',
        )}
      >
        {message || '\u00A0'}
      </span>
      <span className="text-xs text-ts-text-hint">
        先点网页输入框，再点按钮填写
      </span>
    </div>
  );
}
