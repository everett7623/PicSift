# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

PicSift 是 Chrome Manifest V3 扩展，原生 JavaScript / HTML / CSS，**无构建步骤、无 npm 依赖、无 node_modules**。仓库根目录本身就是可通过"加载已解压的扩展程序"直接加载的扩展目录。当前版本 `v0.0.7`。

[AGENTS.md](AGENTS.md) 是给其他 AI 工具的英文入口，只做简要概述并指回本文件，不重复维护细节。

## 文档分工

| 文件 | 写什么 |
| --- | --- |
| README.md | 面向用户：功能、支持站点、安装与更新、权限隐私 |
| USAGE.md | 面向用户：逐步操作说明与故障排查 |
| TESTING.md | 面向开发：自动化命令、手动回归矩阵、发布前检查 |
| CHANGELOG.md | 版本历史；发布产物信息（ZIP 名称、SHA256）只写在 GitHub Release 页面 |
| CLAUDE.md | 面向 AI 与开发：架构、跨文件不变量、测试机制约束 |
| AGENTS.md | 其他 AI 工具的英文入口，指回 CLAUDE.md |

新增文档前先确认归属。仓库曾因随手新建文档而积累出 PROJECT_SUMMARY.md、QUICK_START.html 这类零入口的重复文件，已在 v0.0.6 后清理。

## 开发命令

```bash
bash test.sh                                # 全量检查：文件 + manifest + 版本一致性 + 语法 + 单元测试
node --test tests/*.test.js                 # 全部单元测试（当前 14 个）
node --check content/content.js             # 单文件语法检查
python -m json.tool manifest.json           # 校验 manifest JSON
bash scripts/bump-version.sh 0.0.7          # 一键同步全部版本号
```

只跑单个测试（按测试名正则过滤）：

```bash
node --test --test-name-pattern "ZIP builder" tests/core.test.js
```

Windows 上 `test.sh` 必须用 Git Bash 执行；PowerShell 里用 `& 'C:\Program Files\Git\bin\bash.exe' test.sh`。

## 架构

三个隔离执行环境，全部通过 `chrome.runtime` / `chrome.tabs` 消息通信：

```text
background/background.js   Service Worker：打开/复用工作台标签页、单文件批量下载
popup/popup.js             工作台页面：调度提取、结果筛选、选择预览、多图 ZIP 生成
content/content.js         注入商品页：DOM 扫描、高清 URL 还原、尺寸与比例过滤
```

### 提取链路

点击扩展图标 → background 的 `chrome.action.onClicked` 在**独立标签页**打开 `popup/popup.html?sourceTabId=<来源 tab>`（manifest 刻意不声明 `action.default_popup`，测试对此有断言）→ popup 向来源 tab 发 `extractImages` / `extractVideos` → content script 扫描后返回。

若 content script 不存在（`receiving end does not exist`），popup 会用 `chrome.scripting.executeScript` 重新注入再重试（`sendMessageToSourceTab`）。因此 content.js 必须可被安全重复注入：顶层用 `var` 声明，监听器用 `globalThis.__picSiftMessageListenerInstalled` 做幂等保护。

### 下载链路（两条，容易混淆）

| 场景 | 执行位置 | 产物 |
| --- | --- | --- |
| 选中 ≥ 2 张图片 | popup 自行 fetch，手写 ZIP（store 模式 + CRC32）后直接调 `chrome.downloads.download` | `PicSift/<域名_日期>/images.zip` |
| 单张图片 / 任意数量视频 | 发消息给 background 的 `downloadImages` / `downloadVideos` | `PicSift/<域名_日期>/<images\|videos>/<序号_时间戳>.<扩展名>` |

ZIP 逻辑全部在 popup.js（`buildZipArchive` 及其下方的 ZIP 头 / CRC32 函数），不依赖任何第三方库；background 的循环下载路径实际只服务视频和单图。

### 来源标签页绑定

sourceTabId 有三处冗余保存：URL query 参数、`chrome.storage.session` 中的工作台 tab id、`history.replaceState` 回写。来源页丢失时 `findMostRecentSupportedTab` 按 `lastAccessed` 兜底寻找最近使用的受支持商品页。`resolveSourceTabId` 专门防止"在工作台内再次点击图标、把工作台自己当作来源页"。

### 两段式筛选

- **提取阶段**（content.js `passFilters`）：用户的 minWidth / minHeight / 比例条件，外加**硬下限 200 × 200**；被过滤的图片根本不会返回。
- **结果阶段**（popup.js `filterImagesByResultSpec`）：对 `allExtractedImages` 做本地二次筛选（750/800/1000/1500 + 比例），**不重新扫描页面**。`extractedImages` 是筛选后的可见集合，`selectedImages` 会同步剔除被隐藏的项。

## 跨文件不变量（改动前必读）

1. **新增支持站点 = 改 3 处**：`manifest.json` 的 `host_permissions`、`manifest.json` 的 `content_scripts[0].matches`、`popup/popup.js` 顶部的 `SUPPORTED_HOSTS`。只改其中一处会表现为"未连接商品页"。
2. **版本号有 8 处同步点，不要手改**：`manifest.json` 是唯一事实来源，`tests/core.test.js` 对它和 `popup/popup.html` 的静态徽标做硬断言（徽标运行时会被 `chrome.runtime.getManifest()` 覆盖，但静态值受测试约束）。升版本一律执行 `bash scripts/bump-version.sh <新版本>`，它会改完 manifest、popup.html、tests、README、CLAUDE 共 8 处并逐条打印；CHANGELOG 条目必须人工撰写，`test.sh` 的版本一致性检查会拦截遗漏。
3. **比例阈值写死两份**：`content/content.js` 的 `passFilters` 与 `popup/popup.js` 的 `filterImagesByResultSpec` 各自硬编码 0.9 / 1.1，改一处必须改另一处。
4. **默认门槛 750 受测试约束**：popup.html 中 `minWidth` / `minHeight` 的默认值 `750` 被断言。
5. **消息协议三端同步**：action 名（`ping` / `extractImages` / `extractVideos` / `downloadImages` / `downloadVideos`）与响应结构（`{ success, images | videos | downloaded | failed | failedItems, error }`）必须在 popup、content、background 同时修改。

## 测试机制约束

`tests/core.test.js` 用 `node:vm` 把源文件整体 `runInContext` 到手写沙箱中执行，再直接调用其中的顶层函数。由此产生的硬约束：

- 三个源文件**必须保持顶层函数声明**，不能改成 ESM / CommonJS / IIFE 包裹，否则测试取不到函数。
- 源码只能引用沙箱提供的全局量（`URL`、`console`、`setTimeout`、`chrome`、`document`、`window`、`history`）。新增全局依赖需同步扩充 `loadContentScript` / `loadPopupScript` / `loadBackgroundScript` 的 stub。
- `popup.js` 是**加载即执行**：顶层直接调用 `initializePopup()` 并绑定全部监听器。新增任何 `getElementById` 目标都要让 `createFakeElement` 能应付，否则整套 popup 测试会崩。
- 存在 CSS 结构断言：`.image-grid { grid-auto-rows: 220px }`、`.image-item { aspect-ratio: auto }`、`.image-item img { object-fit: contain }`、`.media-grid.is-empty { grid-auto-rows: auto }` 被锁定，用于防止大批量结果卡片重叠的回归。

## 关键常量

| 常量 | 位置 | 值 |
| --- | --- | --- |
| `MAX_IMAGE_CANDIDATES` | content.js | 350 |
| `IMAGE_LOAD_CONCURRENCY` / `IMAGE_LOAD_TIMEOUT_MS` | content.js | 16 / 4000ms |
| `IMAGE_EXTRACTION_TIMEOUT_MS` | content.js | 18000ms（整体截止时间） |
| `MAX_EMBEDDED_SCRIPT_CHARS` | content.js | 1.5M（内嵌脚本扫描上限） |
| `ARCHIVE_FETCH_CONCURRENCY` / `ARCHIVE_FETCH_TIMEOUT_MS` | popup.js | 4 / 20000ms |
| `MAX_ARCHIVE_BYTES` | popup.js | 256 MB |
| `MAX_DOWNLOAD_ITEMS` | background.js | 500 |

## 约定

- 两空格缩进、单引号、分号、`const` / `let`；变量与函数 camelCase，CSS 类 kebab-case。
- UI 文案与注释保持简体中文。
- Manifest V3 禁止内联脚本、`eval()` 和远程代码执行。
- 异步消息监听器延迟响应时必须 `return true`，同步分支返回 `false`。
- 媒体 URL 只接受 HTTP(S)，由 `normalizeMediaUrl`（content）、`isValidMediaUrl`（popup）、`isAllowedDownloadUrl`（background）三处各自把关；`data:` / `blob:` / `javascript:` 一律拒绝。
- 只用 DOM API 与 `textContent` 渲染，禁止拼接不可信 `innerHTML`。
- 下载路径经 `sanitizePathSegment` 清洗，含 Windows 保留名（con/prn/aux/nul/com1…）处理。
- Commit 使用 Conventional Commits 前缀 + 中文描述，例如 `fix: 拒绝非 HTTP(S) 媒体地址`。

## 调试

- 工作台：在工作台标签页按 `F12`。
- Content Script：在来源商品页按 `F12`。
- Service Worker：`chrome://extensions/` → PicSift → Service Worker 检查视图。

修改源文件后必须在扩展管理页重新加载扩展，再刷新工作台。

## 发布

1. `bash scripts/bump-version.sh <新版本>` 同步版本号。
2. 在 CHANGELOG.md 顶部撰写本版本条目。
3. 跑 `bash test.sh`，再走 [TESTING.md](TESTING.md) 的手动回归矩阵。
4. 打包只含运行时文件的 ZIP：`manifest.json` + `background/` + `content/` + `popup/` + `icons/`，不含 tests、scripts、docs 和开发文档。
5. 校验 ZIP 根目录直接是 `manifest.json`、图标路径为 `icons/icon*.png`。
6. 提交、推送，创建同版本 GitHub Release，把 SHA256 与发布说明写在 Release 页面（仓库内不再维护 RELEASE.md）。

详细检查清单见 [TESTING.md](TESTING.md)，版本历史见 [CHANGELOG.md](CHANGELOG.md)。
