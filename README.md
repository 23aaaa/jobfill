# Job Form Filler -- 网申秋招一键填表工具

Chrome 浏览器扩展，帮助求职者在各类网申页面上快速、准确地填写个人信息。

将简历数据集中管理，打开任意招聘网站，点击字段按钮即可自动填入对应内容，告别反复复制粘贴。

---

## 功能特性

- **侧边栏面板** -- 在任意网页右侧弹出可拖拽的侧边栏，分组展示简历数据
- **一键填写** -- 先点击网页上的输入框，再点击侧边栏中的字段按钮，内容自动填入
- **智能搜索** -- 输入关键词即时过滤字段，快速定位目标信息
- **跳转下一个** -- 一键跳转到页面上的下一个可填写输入框，顺序填写不遗漏
- **隐私模式** -- 一键隐藏/显示填写内容预览，防止旁人窥屏
- **分组折叠** -- 基本信息、教育经历、实习经历、项目经历等按分组折叠管理
- **兼容性强** -- 适配 React/Vue/Angular 等主流前端框架渲染的表单，支持 contenteditable 元素

## 效果预览

安装扩展后，在任意网页点击右下角的「烫水-网申秋招工具」按钮即可打开侧边栏：

1. 点击网页上的输入框（姓名、手机号、邮箱等）
2. 在侧边栏中点击对应字段的按钮
3. 内容自动填入，状态栏提示「已填写」

---

## 快速开始

### 方式一：直接加载（推荐新手）

无需安装 Node.js，适合只想使用工具的用户。

**1. 下载项目**

```bash
git clone https://github.com/23aaaa/job-form-filler.git
cd job-form-filler
```

**2. 配置个人数据**

```bash
cp resume-data.example.js resume-data.js
```

用编辑器打开 `resume-data.js`，将示例数据替换为你的真实信息。数据格式：

```js
var __TS_RESUME_DATA = [
  {
    group: '基本信息',
    items: [
      { label: '姓名', value: '你的姓名' },
      { label: '手机号', value: '你的手机号' },
      // ...更多字段
    ],
  },
  // ...更多分组
];
```

**3. 加载扩展到浏览器**

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 打开右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目的根目录文件夹
5. 扩展安装成功，打开任意网页即可使用

### 方式二：构建安装（开发者推荐）

使用 React + Tailwind CSS 构建的增强版本，UI 更美观，支持更多交互。

**1. 下载项目并安装依赖**

```bash
git clone https://github.com/23aaaa/job-form-filler.git
cd job-form-filler
npm install
```

**2. 配置个人数据**

```bash
cp src/data/resume-data.example.ts src/data/resume-data.local.ts
```

用编辑器打开 `src/data/resume-data.local.ts`，将示例数据替换为你的真实信息。

**3. 构建项目**

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

**4. 加载扩展到浏览器**

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 打开右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目中的 `dist` 文件夹
5. 扩展安装成功

**5.（可选）开发模式**

```bash
npm run dev
```

文件修改后自动重新构建，在 `chrome://extensions/` 点击扩展卡片的刷新按钮即可加载最新代码。

---

## 数据格式说明

### 直接加载版（resume-data.js）

扁平结构，每个分组包含一个 `items` 数组：

```js
var __TS_RESUME_DATA = [
  {
    group: '分组名称',
    items: [
      { label: '字段名', value: '填写内容' },
    ],
  },
];
```

### 构建版（src/data/resume-data.local.ts）

支持子分组（subGroups），适合教育经历、实习经历等有多段记录的场景：

```ts
import type { ResumeGroup } from './resume-data';

export const RESUME_DATA: ResumeGroup[] = [
  {
    group: '教育经历',
    subGroups: [
      {
        name: '硕士 - XX大学',
        items: [
          { label: '学校', value: 'XX大学' },
          { label: '专业', value: 'XX专业' },
        ],
      },
      {
        name: '本科 - YY大学',
        items: [
          { label: '学校', value: 'YY大学' },
          { label: '专业', value: 'YY专业' },
        ],
      },
    ],
  },
];
```

你可以自由增删分组和字段，只需保持上述数据结构即可。

---

## 使用技巧

| 操作 | 说明 |
|------|------|
| 打开侧边栏 | 点击页面右下角的悬浮按钮，或使用浏览器扩展图标 |
| 填写字段 | 先点击网页输入框使其获得焦点，再点击侧边栏中的字段按钮 |
| 搜索字段 | 在侧边栏顶部搜索框输入关键词，实时过滤匹配的字段 |
| 跳转下一个 | 点击「下一个」按钮，自动聚焦到页面上的下一个输入框 |
| 隐私模式 | 点击「显示/已隐藏」切换，隐藏侧边栏中的数据预览 |
| 折叠分组 | 点击分组标题可折叠/展开该分组 |
| 拖拽按钮 | 悬浮按钮支持拖拽移动位置 |

---

## 项目结构

```
job-form-filler/
├── manifest.json              # Chrome 扩展清单（直接加载版）
├── content.js                 # 内容脚本（直接加载版）
├── background.js              # 后台脚本
├── styles.css                 # 样式表（直接加载版）
├── resume-data.example.js     # 简历数据模板（直接加载版）
├── icons/                     # 扩展图标
├── public/
│   └── manifest.json          # Chrome 扩展清单（构建版）
├── src/
│   ├── content/               # 内容脚本入口
│   ├── background/            # 后台脚本
│   ├── containers/            # 容器组件
│   ├── components/            # UI 组件
│   │   ├── cards/             # 卡片组件（教育/实习/项目经历）
│   │   └── ui/                # 基础 UI 组件
│   ├── data/
│   │   ├── resume-data.ts           # 数据加载器（自动检测 local 文件）
│   │   └── resume-data.example.ts   # 简历数据模板（构建版）
│   ├── hooks/                 # React Hooks
│   ├── stores/                # Zustand 状态管理
│   ├── utils/                 # 工具函数
│   └── styles/                # 全局样式
├── vite.config.ts             # Vite 构建配置
├── tailwind.config.ts         # Tailwind CSS 配置
├── tsconfig.json              # TypeScript 配置
└── package.json
```

## 技术栈

- **构建版**: React 18 + TypeScript + Tailwind CSS + Zustand + Vite
- **直接加载版**: Vanilla JavaScript（零依赖）
- **Chrome Extension**: Manifest V3

---

## 隐私说明

- 本工具**完全本地运行**，不会向任何服务器发送你的个人信息
- 你的简历数据仅保存在本地文件中（`resume-data.js` 或 `src/data/resume-data.local.ts`）
- 这些本地数据文件已被 `.gitignore` 忽略，不会被提交到 Git 仓库

---

## 常见问题

**Q: 填写后网页没有反应/数据没保存？**

部分网站使用了深度绑定的前端框架（如 React 受控组件），填入值后可能需要手动触发一次输入框的 blur/focus 事件。工具已内置了事件模拟逻辑，绝大多数情况下可自动处理。如仍有问题，可尝试填入后手动点击输入框外部区域。

**Q: 可以同时填多个字段吗？**

目前为逐个字段填写模式。配合「跳转下一个」功能可以快速顺序填写。

**Q: 支持哪些浏览器？**

支持所有基于 Chromium 的浏览器：Chrome、Edge、Brave、Arc 等。

**Q: 如何更新简历数据？**

直接编辑 `resume-data.js`（直接加载版）或 `src/data/resume-data.local.ts`（构建版），然后：
- 直接加载版：在 `chrome://extensions/` 点击扩展的刷新按钮
- 构建版：重新运行 `npm run build`，再刷新扩展

---

## License

MIT
