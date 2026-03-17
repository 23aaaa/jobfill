import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ResumeItem } from './ResumeItem';
import { cn } from '@/lib/utils';
import type { ResumeSubGroup as SubGroupData } from '@/data/resume-data';

interface ResumeSubGroupProps {
  subGroup: SubGroupData;
  isCollapsed: boolean;
  onToggle: () => void;
  onFill: (value: string) => void;
  showHeader: boolean;
}

export function ResumeSubGroup({
  subGroup,
  isCollapsed,
  onToggle,
  onFill,
  showHeader,
}: ResumeSubGroupProps) {
  if (!showHeader) {
    return (
      <div className="px-2.5 py-1.5">
        {subGroup.items.map((item, i) => (
          <ResumeItem key={i} label={item.label} value={item.value} onFill={onFill} />
        ))}
      </div>
    );
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => onToggle()}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            'flex items-center px-3 py-1.5 cursor-pointer select-none',
            'bg-ts-bg-section hover:bg-ts-bg-elevated-hover transition-colors duration-150',
            'border-b border-ts-border/50',
          )}
        >
          <span className="flex-1 text-[13px] font-medium text-ts-text-secondary">{subGroup.name}</span>
          <span className="text-[11px] text-ts-text-hint mr-1.5">{subGroup.items.length}</span>
          <span
            className={cn(
              'text-[11px] text-ts-text-secondary transition-transform duration-200',
              isCollapsed && '-rotate-90',
            )}
          >
            &#9662;
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2.5 py-1.5">
          {subGroup.items.map((item, i) => (
            <ResumeItem key={i} label={item.label} value={item.value} onFill={onFill} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
