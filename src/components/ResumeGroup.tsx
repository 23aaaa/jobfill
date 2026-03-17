import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ExperienceCard } from './cards/ExperienceCard';
import { EducationCard } from './cards/EducationCard';
import { ProjectCard } from './cards/ProjectCard';
import { GenericCard } from './cards/GenericCard';
import { cn } from '@/lib/utils';
import type { ResumeGroup as GroupData, ResumeSubGroup as SubGroupData } from '@/data/resume-data';

type CardType = 'experience' | 'education' | 'project' | 'generic';

function getCardType(groupName: string): CardType {
  if (groupName === '实习经历') return 'experience';
  if (groupName === '教育经历') return 'education';
  if (groupName === '项目经历') return 'project';
  return 'generic';
}

interface ResumeGroupProps {
  group: GroupData;
  isCollapsed: boolean;
  hideContent: boolean;
  collapsedSubGroups: Record<string, boolean>;
  onToggleGroup: () => void;
  onToggleSubGroup: (key: string) => void;
  onFill: (value: string) => void;
}

export function ResumeGroup({
  group,
  isCollapsed,
  hideContent,
  onToggleGroup,
  onFill,
}: ResumeGroupProps) {
  const cardType = getCardType(group.group);
  const badgeCount = group.subGroups.length;

  return (
    <Collapsible open={!isCollapsed} onOpenChange={onToggleGroup}>
      <div className="mb-2 border border-ts-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              'flex items-center px-3 py-2 cursor-pointer select-none',
              'bg-ts-bg-elevated hover:bg-ts-bg-elevated-hover transition-colors duration-150',
            )}
          >
            <span className="flex-1 text-sm font-semibold text-ts-text">
              {group.group}
            </span>
            <span className="bg-ts-primary text-ts-text-on-primary text-[11px] font-bold px-[7px] py-px rounded-[10px] mr-1.5">
              {badgeCount}
            </span>
            <span
              className={cn(
                'text-xs text-ts-text-secondary transition-transform duration-200',
                isCollapsed && '-rotate-90',
              )}
            >
              &#9662;
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-2">
            {group.subGroups.map((sg, i) => (
              <CardRenderer
                key={i}
                cardType={cardType}
                subGroup={sg}
                onFill={onFill}
                hideContent={hideContent}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function CardRenderer({
  cardType,
  subGroup,
  onFill,
  hideContent,
}: {
  cardType: CardType;
  subGroup: SubGroupData;
  onFill: (value: string) => void;
  hideContent: boolean;
}) {
  switch (cardType) {
    case 'experience':
      return <ExperienceCard subGroup={subGroup} onFill={onFill} hideContent={hideContent} />;
    case 'education':
      return <EducationCard subGroup={subGroup} onFill={onFill} hideContent={hideContent} />;
    case 'project':
      return <ProjectCard subGroup={subGroup} onFill={onFill} hideContent={hideContent} />;
    case 'generic':
      return <GenericCard subGroup={subGroup} onFill={onFill} hideContent={hideContent} />;
  }
}
