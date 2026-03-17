import { CardField } from '@/components/ClickableValue';
import { cn } from '@/lib/utils';
import type { ResumeSubGroup } from '@/data/resume-data';

interface GenericCardProps {
  subGroup: ResumeSubGroup;
  onFill: (value: string) => void;
  hideContent?: boolean;
}

export function GenericCard({ subGroup, onFill, hideContent }: GenericCardProps) {
  return (
    <div className="bg-ts-bg border border-ts-border rounded-lg mb-2 overflow-hidden">
      <div
        className={cn(
          'px-3 py-2.5',
          hideContent ? 'flex flex-wrap gap-1' : 'space-y-0.5',
        )}
      >
        {subGroup.items.map((item, i) => (
          <CardField
            key={i}
            label={item.label}
            value={item.value}
            onFill={onFill}
            hideContent={hideContent}
          />
        ))}
      </div>
    </div>
  );
}
