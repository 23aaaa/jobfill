import { ClickableValue, CardField, findValue } from '@/components/ClickableValue';
import { cn } from '@/lib/utils';
import type { ResumeSubGroup } from '@/data/resume-data';

interface ProjectCardProps {
  subGroup: ResumeSubGroup;
  onFill: (value: string) => void;
  hideContent?: boolean;
}

export function ProjectCard({ subGroup, onFill, hideContent }: ProjectCardProps) {
  const { items } = subGroup;
  const name = findValue(items, '项目名称');
  const time = findValue(items, '时间');
  const role = findValue(items, '角色');
  const desc = findValue(items, '项目描述');

  return (
    <div className="bg-ts-bg border border-ts-border rounded-lg mb-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2">
        <ClickableValue
          value={name}
          label="项目名称"
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

      {/* Role */}
      {role && (
        <div className={cn('px-3 pb-2 border-t border-ts-border/40 pt-2', hideContent && 'flex flex-wrap gap-1')}>
          <CardField label="角色" value={role} onFill={onFill} hideContent={hideContent} />
        </div>
      )}

      {/* Description */}
      {desc && (
        <div className={cn('px-3 pb-3 border-t border-ts-border/40 pt-2', hideContent && 'flex flex-wrap gap-1')}>
          {!hideContent && <div className="text-xs text-ts-text-hint mb-1">项目描述</div>}
          <ClickableValue
            value={desc}
            label="项目描述"
            onFill={onFill}
            hideContent={hideContent}
            className={hideContent ? '' : 'text-xs text-ts-text leading-relaxed line-clamp-1'}
          />
        </div>
      )}
    </div>
  );
}
