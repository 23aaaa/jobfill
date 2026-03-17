/**
 * 简历数据模板 -- 复制此文件为 resume-data.local.ts 并填入你的真实信息
 *
 *   cp src/data/resume-data.example.ts src/data/resume-data.local.ts
 */
import type { ResumeGroup } from './resume-data';

export const RESUME_DATA: ResumeGroup[] = [
  {
    group: '基本信息',
    subGroups: [
      {
        name: '基本信息',
        items: [
          { label: '姓名', value: '张三' },
          { label: '性别', value: '男' },
          { label: '出生日期', value: '2000-01-01' },
          { label: '手机号', value: '13800138000' },
          { label: '邮箱', value: 'zhangsan@example.com' },
          { label: '身份证', value: '110101200001010000' },
          { label: '现居住地', value: '北京市' },
          { label: '最高学历', value: '硕士研究生' },
          { label: '紧急联系人', value: 'XX' },
          { label: '紧急联系人电话', value: '13800138000' },
        ],
      },
    ],
  },
  {
    group: '教育经历',
    subGroups: [
      {
        name: '硕士 - XX大学',
        items: [
          { label: '学校', value: 'XX大学' },
          { label: '学院', value: 'XX学院' },
          { label: '专业', value: 'XX专业' },
          { label: '学历', value: '硕士研究生' },
          { label: '学制', value: '全日制' },
          { label: '成绩排名', value: '前XX%' },
          { label: 'GPA', value: 'X.XX' },
          { label: '时间', value: '2023/09-2026/06' },
        ],
      },
      {
        name: '本科 - XX大学',
        items: [
          { label: '学校', value: 'XX大学' },
          { label: '学院', value: 'XX学院' },
          { label: '专业', value: 'XX专业' },
          { label: '学历', value: '大学本科' },
          { label: '学制', value: '全日制' },
          { label: '成绩排名', value: '前XX%' },
          { label: 'GPA', value: 'X.XX' },
          { label: '时间', value: '2019/09-2023/06' },
        ],
      },
    ],
  },
  {
    group: '实习经历',
    subGroups: [
      {
        name: 'XX公司',
        items: [
          { label: '公司', value: 'XX公司' },
          { label: '时间', value: '2025/01-2025/06' },
          { label: '部门', value: 'XX部门' },
          { label: '职位', value: 'XX实习生' },
          { label: '工作类型', value: '实习' },
          { label: '工作描述', value: '在此填写你的工作描述...' },
        ],
      },
    ],
  },
  {
    group: '项目经历',
    subGroups: [
      {
        name: 'XX项目',
        items: [
          { label: '项目名称', value: 'XX项目' },
          { label: '时间', value: '2025/01-2025/06' },
          { label: '角色', value: '项目成员' },
          { label: '项目描述', value: '在此填写你的项目描述...' },
        ],
      },
    ],
  },
  {
    group: '校园经历',
    subGroups: [
      {
        name: 'XX组织',
        items: [
          { label: '校园组织', value: 'XX组织' },
          { label: '时间', value: '2023/09-2026/06' },
          { label: '职务', value: 'XX职务' },
          { label: '经历描述', value: '在此填写你的校园经历...' },
        ],
      },
    ],
  },
  {
    group: '技能水平',
    subGroups: [
      {
        name: '技能水平',
        items: [
          { label: '技能1', value: '熟练' },
          { label: '技能2', value: '精通' },
          { label: '技能3', value: '了解' },
        ],
      },
    ],
  },
  {
    group: '自我评价',
    subGroups: [
      {
        name: '自我评价',
        items: [
          { label: '自我评价', value: '在此填写你的自我评价...' },
        ],
      },
    ],
  },
];
