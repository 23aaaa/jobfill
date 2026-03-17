# JobFill

> Chrome extension to autofill job application forms. Open-source, privacy-first, works on any recruitment website.

**网申秋招一键填表工具** -- 开源 Chrome 浏览器扩展，一键自动填写招聘网站表单。

将简历数据集中管理，打开任意招聘网站（牛客、智联、BOSS直聘、企业校招官网等），点击字段按钮即可自动填入，告别反复复制粘贴。适用于校招、社招、实习等各类网申场景。完全本地运行，不上传任何数据，隐私安全。

**如果这个工具对你有帮助，请点一下右上角的 Star 支持一下，让更多求职同学看到。**

---

## 为什么需要这个工具？

秋招季投递几十上百家公司，每家的网申系统都要手动填一遍：姓名、手机号、邮箱、身份证、学校、专业、GPA、实习经历、项目经历......

痛点很明确：

- 每个网站的表单字段名不一样，不能用浏览器自带的自动填充
- 大段的实习/项目描述需要反复从简历里复制粘贴
- 同一份信息填了几十遍，耗时且容易出错
- 有些网站还会清空你填到一半的内容

这个工具把你的所有简历信息集中到一个侧边栏，打开任意网页，点一下就填好。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 侧边栏面板 | 在任意网页右侧弹出可拖拽的侧边栏，分组展示简历数据 |
| 一键填写 | 先点击网页上的输入框，再点击侧边栏中的字段按钮，内容自动填入 |
| 智能搜索 | 输入关键词即时过滤字段，快速定位目标信息 |
| 跳转下一个 | 一键跳转到页面上的下一个可填写输入框，顺序填写不遗漏 |
| 隐私模式 | 一键隐藏/显示填写内容预览，防止旁人窥屏 |
| 分组折叠 | 基本信息、教育经历、实习经历、项目经历等按分组折叠管理 |
| 框架兼容 | 适配 React/Vue/Angular 等主流前端框架渲染的表单，支持 contenteditable |
| 完全离线 | 数据只存在本地，不联网、不上传，隐私安全 |

---

## 快速开始

### 方式一：直接加载（零门槛，推荐新手）

无需安装 Node.js，3 分钟上手。

**第 1 步 -- 下载项目**

```bash
git clone https://github.com/23aaaa/jobfill.git
cd jobfill
```

> 不会用 git？点击页面右上角绿色的 `Code` 按钮，选择 `Download ZIP`，解压即可。

**第 2 步 -- 配置你的简历数据**

```bash
cp resume-data.example.js resume-data.js
```

用任意文本编辑器打开 `resume-data.js`，把示例数据替换为你的真实信息：

```js
var __TS_RESUME_DATA = [
  {
    group: '基本信息',       // 分组名称
    items: [
      { label: '姓名', value: '你的姓名' },
      { label: '手机号', value: '你的手机号' },
      { label: '邮箱', value: '你的邮箱' },
      // 可以自由增删字段
    ],
  },
  {
    group: '教育经历',
    items: [
      { label: '学校', value: '你的学校' },
      { label: '专业', value: '你的专业' },
      // ...
    ],
  },
  // 继续添加：实习经历、项目经历、技能水平等
];
```

**第 3 步 -- 加载扩展到 Chrome**

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 打开右上角的 **「开发者模式」** 开关
3. 点击左上角 **「加载已解压的扩展程序」**
4. 选择本项目的 **根目录文件夹**（包含 `manifest.json` 的那个）
5. 完成 -- 打开任意招聘网页即可看到右下角的悬浮按钮

### 方式二：构建安装（开发者推荐）

React + Tailwind CSS 增强版本，UI 更美观，支持卡片式展示教育/实习/项目经历。

**第 1 步 -- 安装依赖**

```bash
git clone https://github.com/23aaaa/jobfill.git
cd jobfill
npm install
```

**第 2 步 -- 配置你的简历数据**

```bash
cp src/data/resume-data.example.ts src/data/resume-data.local.ts
```

编辑 `src/data/resume-data.local.ts`，填入你的真实信息。构建版支持子分组（subGroups），适合有多段教育/实习经历的场景：

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
          { label: '时间', value: '2023/09-2026/06' },
        ],
      },
      {
        name: '本科 - YY大学',
        items: [
          { label: '学校', value: 'YY大学' },
          { label: '专业', value: 'YY专业' },
          { label: '时间', value: '2019/09-2023/06' },
        ],
      },
    ],
  },
  // ...更多分组
];
```

**第 3 步 -- 构建**

```bash
npm run build
```

**第 4 步 -- 加载到 Chrome**

同方式一，但选择项目中的 **`dist`** 文件夹。

**开发模式（可选）**

```bash
npm run dev
```

文件修改后自动重新构建。在 `chrome://extensions/` 点击扩展的刷新图标即可加载最新代码。

---

## 使用方法

### 基本操作

1. 打开任意招聘网站（牛客、智联、BOSS直聘、各企业官网等）
2. 点击页面右下角的 **悬浮按钮** 打开侧边栏
3. **先点击** 网页上的某个输入框（让它获得焦点）
4. **再点击** 侧边栏中对应字段的按钮
5. 内容自动填入，底部状态栏提示「已填写」

### 进阶技巧

| 操作 | 说明 |
|------|------|
| 搜索字段 | 在侧边栏顶部搜索框输入关键词（如「邮箱」「项目」），实时过滤 |
| 跳转下一个 | 点击「下一个」按钮，自动定位到页面上下一个空输入框 |
| 隐私模式 | 点击「显示/已隐藏」切换，在公共场所防止旁人看到你的信息 |
| 折叠分组 | 点击分组标题可折叠/展开，减少视觉干扰 |
| 拖拽按钮 | 悬浮按钮挡住内容？直接拖到别的位置 |
| 快捷键 | 点击浏览器工具栏中的扩展图标也可以打开/关闭侧边栏 |

### 更新简历数据

修改数据文件后：
- **直接加载版**：在 `chrome://extensions/` 点击扩展卡片的刷新按钮
- **构建版**：重新运行 `npm run build`，再刷新扩展

---

## 已适配的网站

工具采用通用的表单识别和事件模拟机制，理论上适配所有网站。以下是经过测试验证的：

| 平台 | 状态 |
|------|------|
| 牛客网 | 已验证 |
| 各企业校招官网 | 已验证 |
| 智联招聘 | 已验证 |
| 其他 Chromium 可访问的网站 | 通用支持 |

> 遇到不兼容的网站？欢迎提 [Issue](https://github.com/23aaaa/jobfill/issues) 反馈。

---

## 项目结构

```
jobfill/
├── manifest.json                # Chrome 扩展清单（直接加载版）
├── content.js                   # 内容脚本（直接加载版，Vanilla JS）
├── background.js                # 后台脚本
├── styles.css                   # 样式（直接加载版）
├── resume-data.example.js       # 简历数据模板
├── icons/                       # 扩展图标
├── public/
│   └── manifest.json            # Chrome 扩展清单（构建版）
├── src/
│   ├── content/                 # 内容脚本入口（React）
│   ├── containers/              # 容器组件
│   ├── components/              # UI 组件
│   │   ├── cards/               # 卡片组件（教育/实习/项目经历）
│   │   └── ui/                  # 基础 UI 组件（Button / Input / ScrollArea）
│   ├── data/
│   │   ├── resume-data.ts       # 数据加载器（自动检测 local > example）
│   │   └── resume-data.example.ts  # 简历数据模板（构建版）
│   ├── hooks/                   # use-form-filler / use-input-scanner / use-search
│   ├── stores/                  # Zustand 状态管理
│   ├── utils/                   # DOM 操作 & 填充逻辑
│   └── styles/                  # Tailwind 全局样式
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 技术栈

| 版本 | 技术 |
|------|------|
| 构建版 | React 18 + TypeScript + Tailwind CSS + Zustand + Radix UI + Vite |
| 直接加载版 | Vanilla JavaScript（零依赖，单文件） |
| 扩展规范 | Chrome Extension Manifest V3 |

---

## Roadmap

- [x] 逐字段点击填写
- [x] 智能搜索 & 字段过滤
- [x] 隐私模式
- [x] 输入框自动跳转
- [ ] **针对主流招聘网站的一键全填** -- 识别特定网站的表单结构，一键自动匹配并填写所有字段
- [ ] 下拉选择框自动匹配（学历、城市、学校等）
- [ ] 数据导入/导出（JSON / 从简历 PDF 解析）
- [ ] 填写历史记录 & 撤销
- [ ] 多份简历切换（针对不同岗位投递不同版本）

---

## 隐私说明

- 本工具 **完全本地运行**，不请求任何外部服务器
- 你的简历数据仅保存在本地文件中，不经过网络传输
- 个人数据文件（`resume-data.js` / `resume-data.local.ts`）已被 `.gitignore` 忽略，不会提交到 Git

---

## 常见问题

<details>
<summary><b>Q: 填写后网页没有反应 / 数据没保存？</b></summary>

部分网站使用深度绑定的前端框架（如 React 受控组件），工具已内置了完整的事件模拟链（mousedown -> focus -> input -> change -> blur -> compositionend 等），绝大多数情况下可自动处理。

如仍有问题，尝试：
1. 填入后手动点击输入框外部区域（触发 blur）
2. 填入后按一下 Tab 键
3. 如果是下拉选择框，目前需要手动选择（后续版本会支持）
</details>

<details>
<summary><b>Q: 可以同时填多个字段吗？</b></summary>

当前为逐字段填写模式。配合「跳转下一个」功能可以快速顺序填写。

一键全填功能正在开发中（见 Roadmap），将支持针对主流招聘网站自动识别并批量填写所有字段。
</details>

<details>
<summary><b>Q: 支持哪些浏览器？</b></summary>

所有基于 Chromium 内核的浏览器：
- Google Chrome
- Microsoft Edge
- Brave
- Arc
- Opera

暂不支持 Firefox（Manifest V3 兼容性差异）。
</details>

<details>
<summary><b>Q: 工具会不会收集我的个人信息？</b></summary>

不会。代码完全开源，没有任何网络请求，数据只在你的浏览器本地运行。你可以自行审查 `content.js` 和 `src/` 目录下的所有源码。
</details>

<details>
<summary><b>Q: 扩展提示「此扩展未经 Chrome 网上应用店认证」？</b></summary>

这是因为通过「加载已解压的扩展程序」安装的开发者模式扩展都会显示此提示，属于正常现象。工具代码完全开源透明，可放心使用。
</details>

---

## 参与贡献

欢迎提交 Issue 和 Pull Request。

如果你想为某个特定招聘网站添加「一键全填」适配，或者发现了兼容性问题，非常欢迎贡献：

1. Fork 本仓库
2. 创建你的分支：`git checkout -b feat/your-feature`
3. 提交更改：`git commit -m "feat: 添加XX网站一键填充适配"`
4. 推送分支：`git push origin feat/your-feature`
5. 提交 Pull Request

---

## 赞赏支持

如果这个工具帮你节省了时间，欢迎请作者喝杯水：

<p align="center">
  <img src="docs/appreciation-qr.jpg" alt="赞赏码" width="300">
</p>

---

## License

[MIT](LICENSE)
