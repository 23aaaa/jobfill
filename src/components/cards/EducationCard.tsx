import { ClickableValue, CardField, findValue } from '@/components/ClickableValue';
import { cn } from '@/lib/utils';
import type { ResumeSubGroup } from '@/data/resume-data';

interface EducationCardProps {
  subGroup: ResumeSubGroup;
  onFill: (value: string) => void;
  hideContent?: boolean;
}

export function EducationCard({ subGroup, onFill, hideContent }: EducationCardProps) {
  const { items } = subGroup;
  const school = findValue(items, '学校');
  const time = findValue(items, '时间');
  const major = findValue(items, '专业');
  const degree = findValue(items, '学历');
  const mode = findValue(items, '学制');
  const rank = findValue(items, '成绩排名');
  const gpa = findValue(items, 'GPA');
  const college = findValue(items, '学院');
  const research = findValue(items, '研究方向');
  const lab = findValue(items, '实验室');
  const advisor = findValue(items, '导师');

  const tagItems = [
    { label: '专业', value: major },
    { label: '学历', value: degree },
    { label: '学制', value: mode },
    { label: '成绩排名', value: rank },
    { label: 'GPA', value: gpa },
  ].filter((t) => Boolean(t.value));

  return (
    <div className="bg-ts-bg border border-ts-border rounded-lg mb-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-1">
        <ClickableValue
          value={school}
          label="学校"
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

      {/* Tags */}
      {tagItems.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {tagItems.map((t) => (
            <ClickableValue
              key={t.label}
              value={t.value}
              label={t.label}
              onFill={onFill}
              hideContent={hideContent}
              className={hideContent ? '' : 'text-xs text-ts-text-secondary'}
            />
          ))}
        </div>
      )}

      {/* Detail fields */}
      {(college || research || lab || advisor) && (
        <div
          className={cn(
            'px-3 pb-3 border-t border-ts-border/40 pt-2',
            hideContent ? 'flex flex-wrap gap-1' : 'space-y-0.5',
          )}
        >
          <CardField label="学院名称" value={college} onFill={onFill} hideContent={hideContent} />
          <CardField label="研究方向" value={research} onFill={onFill} hideContent={hideContent} />
          <CardField label="实验室" value={lab} onFill={onFill} hideContent={hideContent} />
          <CardField label="导师" value={advisor} onFill={onFill} hideContent={hideContent} />
        </div>
      )}
    </div>
  );
}
