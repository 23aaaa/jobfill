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

interface FlatGroup {
  group: string;
  items: ResumeItem[];
}

declare global {
  // eslint-disable-next-line no-var
  var __TS_RESUME_DATA: FlatGroup[] | undefined;
}

const LABEL_REMAP: Record<string, Record<string, string>> = {
  '项目经历': {
    '名称': '项目名称',
    '描述': '项目描述',
  },
};

const NAME_FIELDS = ['学校', '公司', '项目名称'];

function transformFlatToGroups(flatGroups: FlatGroup[]): ResumeGroup[] {
  return flatGroups.map((fg) => {
    const remap = LABEL_REMAP[fg.group];
    const prefixMap = new Map<string, ResumeItem[]>();
    const prefixOrder: string[] = [];

    for (const item of fg.items) {
      const dashIdx = item.label.indexOf('-');
      if (dashIdx > 0) {
        const prefix = item.label.slice(0, dashIdx);
        let field = item.label.slice(dashIdx + 1);
        if (remap?.[field]) field = remap[field];
        if (!prefixMap.has(prefix)) {
          prefixMap.set(prefix, []);
          prefixOrder.push(prefix);
        }
        prefixMap.get(prefix)!.push({ label: field, value: item.value });
      }
    }

    if (prefixMap.size > 0) {
      const subGroups = prefixOrder.map((prefix) => {
        const items = prefixMap.get(prefix)!;
        const nameItem = items.find((i) => NAME_FIELDS.includes(i.label));
        const name = nameItem ? nameItem.value : prefix;
        return { name, items };
      });
      return { group: fg.group, subGroups };
    }

    return {
      group: fg.group,
      subGroups: [{ name: fg.group, items: fg.items }],
    };
  });
}

import { RESUME_DATA as EXAMPLE_DATA } from './resume-data.example';

export const RESUME_DATA: ResumeGroup[] =
  typeof __TS_RESUME_DATA !== 'undefined' && __TS_RESUME_DATA.length > 0
    ? transformFlatToGroups(__TS_RESUME_DATA)
    : EXAMPLE_DATA;

export function getTotalItemCount(groups: ResumeGroup[]): number {
  return groups.reduce(
    (sum, g) => sum + g.subGroups.reduce((s, sg) => s + sg.items.length, 0),
    0,
  );
}

export function getGroupItemCount(group: ResumeGroup): number {
  return group.subGroups.reduce((s, sg) => s + sg.items.length, 0);
}
