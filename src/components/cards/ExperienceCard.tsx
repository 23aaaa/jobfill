import { ClickableValue, CardField, findValue } from '@/components/ClickableValue';
import { cn } from '@/lib/utils';
import type { ResumeSubGroup } from '@/data/resume-data';

interface ExperienceCardProps {
  subGroup: ResumeSubGroup;
  onFill: (value: string) => void;
  hideContent?: boolean;
}

export function ExperienceCard({ subGroup, onFill, hideContent }: ExperienceCardProps) {
  const { items } = subGroup;
  const company = findValue(items, '公司');
  const time = findValue(items, '时间');
  const dept = findValue(items, '部门');
  const title = findValue(items, '职位');
  const workType = findValue(items, '工作类型');
  const desc = findValue(items, '工作描述');

  return (
    <div className="bg-ts-bg border border-ts-border rounded-lg mb-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2">
        <ClickableValue
          value={company}
          label="公司"
          onFill={onFill}
          hideContent={hideContent}
          className={hideContent ? '' : 'text-[15px] font-bold text-ts-text'}
        />
        <ClickableValue
          value={time}
          label="时间"
          onFill={onFill}
          hideContent={hideContent}
          className={hideContent ? '' : 'text-xs text-ts-text-secondary shrink-0 ml-2 mt-0.5'}
        />
      </div>

      {/* Meta */}
      {(dept || title || workType) && (
        <div
          className={cn(
            'px-3 pb-2 border-t border-ts-border/40 pt-2',
            hideContent ? 'flex flex-wrap gap-1' : 'space-y-0.5',
          )}
        >
          <CardField label="部门名称" value={dept} onFill={onFill} hideContent={hideContent} />
          <CardField label="职位名称" value={title} onFill={onFill} hideContent={hideContent} />
          <CardField label="工作类型" value={workType} onFill={onFill} hideContent={hideContent} />
        </div>
      )}

      {/* Description */}
      {desc && (
        <div className={cn('px-3 pb-3 border-t border-ts-border/40 pt-2', hideContent && 'flex flex-wrap gap-1')}>
          {!hideContent && <div className="text-xs text-ts-text-hint mb-1">工作描述</div>}
          <ClickableValue
            value={desc}
            label="工作描述"
            onFill={onFill}
            hideContent={hideContent}
            className={hideContent ? '' : 'text-xs text-ts-text leading-relaxed line-clamp-1'}
          />
        </div>
      )}
    </div>
  );
}
