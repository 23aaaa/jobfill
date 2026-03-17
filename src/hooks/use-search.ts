import { useMemo } from 'react';
import type { ResumeGroup } from '@/data/resume-data';

export function useSearch(groups: ResumeGroup[], keyword: string): ResumeGroup[] {
  return useMemo(() => {
    const kw = keyword.toLowerCase().trim();
    if (!kw) return groups;

    return groups
      .map((g) => {
        const filteredSubGroups = g.subGroups
          .map((sg) => {
            const filteredItems = sg.items.filter(
              (item) =>
                item.label.toLowerCase().includes(kw) ||
                item.value.toLowerCase().includes(kw),
            );
            return filteredItems.length > 0
              ? { ...sg, items: filteredItems }
              : null;
          })
          .filter(Boolean) as typeof g.subGroups;

        return filteredSubGroups.length > 0
          ? { ...g, subGroups: filteredSubGroups }
          : null;
      })
      .filter(Boolean) as ResumeGroup[];
  }, [groups, keyword]);
}
