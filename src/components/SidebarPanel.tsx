import { useRef, useCallback, type MouseEvent as RMouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarHeader } from './SidebarHeader';
import { SearchInput } from './SearchInput';
import { ResumeGroup } from './ResumeGroup';
import { SidebarFooter } from './SidebarFooter';
import type { ResumeGroup as GroupData } from '@/data/resume-data';
import type { MsgType } from '@/stores/sidebar-store';

interface SidebarPanelProps {
  isVisible: boolean;
  hideContent: boolean;
  searchKeyword: string;
  message: string;
  messageType: MsgType;
  groups: GroupData[];
  collapsedGroups: Record<string, boolean>;
  collapsedSubGroups: Record<string, boolean>;
  width: number;
  onSearch: (v: string) => void;
  onTogglePrivacy: () => void;
  onJumpNext: () => void;
  onClose: () => void;
  onToggleGroup: (name: string) => void;
  onToggleSubGroup: (key: string) => void;
  onFill: (value: string) => void;
  onWidthChange: (w: number) => void;
}

export function SidebarPanel({
  isVisible,
  hideContent,
  searchKeyword,
  message,
  messageType,
  groups,
  collapsedGroups,
  collapsedSubGroups,
  width,
  onSearch,
  onTogglePrivacy,
  onJumpNext,
  onClose,
  onToggleGroup,
  onToggleSubGroup,
  onFill,
  onWidthChange,
}: SidebarPanelProps) {
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeStart = useCallback(
    (e: RMouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      const onMove = (ev: globalThis.MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = startXRef.current - ev.clientX;
        onWidthChange(startWidthRef.current + delta);
      };

      const onUp = () => {
        resizingRef.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [width, onWidthChange],
  );

  return (
    <div
      style={{ width: `${width}px` }}
      className={cn(
        'fixed top-0 right-0 h-screen z-[2147483645]',
        'bg-ts-bg shadow-ts-sidebar border-l border-ts-border-sidebar',
        'transition-transform duration-300 ease-out',
        isVisible ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* 左侧拖拽手柄 */}
      <div
        className={cn(
          'absolute left-0 top-0 w-1.5 h-full cursor-col-resize z-10',
          'hover:bg-ts-primary/20 active:bg-ts-primary/30',
          'transition-colors duration-150',
        )}
        onMouseDown={handleResizeStart}
      />

      <div className="flex flex-col h-full">
        <SidebarHeader
          hideContent={hideContent}
          onTogglePrivacy={onTogglePrivacy}
          onJumpNext={onJumpNext}
          onClose={onClose}
        />

        <SearchInput value={searchKeyword} onChange={onSearch} />

        <ScrollArea className="flex-1">
          <div className="p-3.5">
            {groups.length === 0 ? (
              <div className="text-center text-ts-text-hint text-sm py-8">
                未找到匹配项
              </div>
            ) : (
              groups.map((g) => (
                <ResumeGroup
                  key={g.group}
                  group={g}
                  isCollapsed={!!collapsedGroups[g.group]}
                  hideContent={hideContent}
                  collapsedSubGroups={collapsedSubGroups}
                  onToggleGroup={() => onToggleGroup(g.group)}
                  onToggleSubGroup={onToggleSubGroup}
                  onFill={onFill}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <SidebarFooter message={message} messageType={messageType} />
      </div>
    </div>
  );
}
