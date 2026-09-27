# 代码改动边界

相对于上传的 1.0.0-rc.1 源码，以下生产文件发生变化。

| 文件 | 操作 |
|---|---|
| `extension/background.js` | 修改 |
| `extension/domain/model.js` | 修改 |
| `extension/domain/templates.js` | 修改 |
| `extension/infra/workbook-v2.js` | 新增 |
| `extension/infra/xlsx.js` | 修改 |
| `extension/manager.html` | 修改 |
| `extension/manifest.json` | 修改 |
| `extension/shared/design-tokens.js` | 新增 |
| `extension/sidepanel.html` | 修改 |
| `extension/third-party-notices.txt` | 新增 |
| `extension/ui/app.js` | 修改 |
| `extension/ui/dom.js` | 修改 |
| `extension/ui/style.css` | 修改 |
| `extension/ui/theme.js` | 新增 |

`infra/storage-core.js`、`infra/repository.js`、`infra/vault.js`、`bridge/content.js` 与 `bridge/fill-engine.js` 保持逐字节不变。后台仅调整产品名称相关提示。没有重新实现保存、加密和填写引擎。
