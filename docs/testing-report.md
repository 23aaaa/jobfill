# 小师弟求职 · 测试与交付状态

版本：1.1.0-rc.1。源文件指纹：`ba1face72fbb93d1ebf462c94cbcbd065ea115f5cbcda7ba0ec7d21ce0c0a7f7`。

## 自动化结果

| 测试集 | 总数 | 通过 | 失败 | 范围 |
|---|---:|---:|---:|---|
| Node 单元回归 | 127 | 127 | 0 | 领域、存储、加密、文件协议、模拟后台权限与路由 |
| 原有浏览器回归 | 58 | 58 | 0 | 真实 DOM 与产品 UI，保留原 58 项行为检查 |
| 精修对抗性回归 | 32 | 32 | 0 | 主题、全局搜索、窄屏、长文、键盘、懒挂载、分页、Excel v1/v2 |

详见 `reports/unit-tests.json` / `.tap`、`reports/browser-tests.json`、`reports/refinement-tests.json`。每份报告绑定当前 `extension/` 源文件指纹。这里不把包含测试文件的 coverage 统计冒充整产品覆盖率。

## 实际执行环境与替身

Node v22.16.0，Chromium 144.0.7559.96。浏览器测试执行产品真实 HTML/CSS/JavaScript 和真实表单 DOM。由于测试环境策略限制，页面源的 localStorage、Web Locks、Chrome API、剪贴板与下载分发有明确替身。导出产生的 Blob、XLSX XML 解析和 DOM 写入不是截图模拟。

当前原生导航探测：`blocked`。原生扩展加载探测：`blocked-or-not-loaded`。

错误：`Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at http://127.0.0.1:44625/dist/%E5%B0%8F%E5%B8%88%E5%BC%9F%E6%B1%82%E8%81%8C-%E8%B5%84%E6%96%99%E7%BB%B4%E6%8A%A4.html`。

没有绕过管理员策略来伪造通过。没有声称测试了真实 React/Vue 库、真实招聘网站登录草稿流程、操作系统下载或真实侧栏焦点。

## 新增检查重点

旧版本数据文件仍能导入；可见 Excel 单元格修改是唯一依据；复制行/经历/表不会要求用户编 ID；公式、数字化长证件号、错位记录、缺失字段名或损坏文件不会局部覆盖资料。中文、emoji、CRLF、前导零、等号和 `_xNNNN_` 字面量均有回归。

搜索支持组合输入、Esc、Ctrl/Cmd+K、全半角和大小写。敏感字段值不参加检索。5,000 字段例子查到唯一结果；450 项宽泛结果按 200/400/450 完整显示。记录按需挂载，且未变化的目标轮询不会破坏焦点。

六种主题分别验证实际 CSS、选中状态、本地偏好、重新启动读取以及不修改简历数据。数值对比检查白字/主色和选中项文字/背景。窄屏覆盖侧栏 320/360/420/600，维护页 360/768/1440；长标签和 30k 字符全文可访问。

## 不等同于完成的验收

**尚未完成：** Windows 原生 Chrome 安装与权限、侧栏拖动和真实跨窗焦点；字节/阿里/美团等真实账号草稿与保存回读；Excel 和 WPS 桌面软件实际编辑再保存；真人首次使用研究；付款、许可证、客服、退款和商店审核。

发布门禁仍为 HOLD，原因记录在 `reports/release-gate.json`。`docs/validation/release-checklist.json` 的待验项目没有被自动填成通过。安装候选包可用于本机验收，不是已经售卖验证或商店审核通过的产品。

## 复现

```bash
npm run check
npm test
npm run test:browser
npm run verify:release
```

`verify:release` 检查全部三份报告及指纹，再检查运营者和人工证据。缺证时非零退出是预期行为。自动化通过与人工缺证分开处理。
