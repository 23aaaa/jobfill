export interface ResumeItem {
  label: string;
  value: string;
}

export interface ResumeSubGroup {
  name: string;
  items: ResumeItem[];
}

export interface ResumeGroup {
  group: string;
  subGroups: ResumeSubGroup[];
}

interface ResumeDataModule {
  RESUME_DATA: ResumeGroup[];
}

const localModules = import.meta.glob<ResumeDataModule>(
  './resume-data.local.ts',
  { eager: true },
);

import { RESUME_DATA as EXAMPLE_DATA } from './resume-data.example';

export const RESUME_DATA: ResumeGroup[] =
  localModules['./resume-data.local.ts']?.RESUME_DATA ?? EXAMPLE_DATA;

/** 所有 item 总数 */
export function getTotalItemCount(groups: ResumeGroup[]): number {
  return groups.reduce(
    (sum, g) => sum + g.subGroups.reduce((s, sg) => s + sg.items.length, 0),
    0,
  );
}

/** 某个 group 的 item 总数 */
export function getGroupItemCount(group: ResumeGroup): number {
  return group.subGroups.reduce((s, sg) => s + sg.items.length, 0);
}
