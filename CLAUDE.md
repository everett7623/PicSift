# PicSift 开发说明

## 项目概述

PicSift 是 Chrome Manifest V3 扩展，使用原生 JavaScript、HTML 和 CSS，无打包与依赖安装步骤。当前版本：`v0.0.6`。

## 架构

```text
background/background.js
  └─ chrome.action.onClicked：打开或复用工作台，保存来源 tab id

popup/popup.js
  ├─ 向来源 tab 的 content script 发送提取消息
  ├─ 渲染、筛选、选择和预览媒体
  ├─ 多图片 fetch + ZIP 生成
  └─ 单媒体交给 background 下载

content/content.js
  ├─ 通用 DOM、懒加载和 CSS 背景图扫描
  ├─ 站点专用选择器和元数据扫描
  ├─ 高清 URL 标准化
  └─ 尺寸与比例过滤
```

## 开发命令

```bash
node --check content/content.js
node --check popup/popup.js
node --check background/background.js
node --test tests/*.test.js
python -m json.tool manifest.json
bash test.sh
```

## 约定

- 两空格缩进、单引号、分号。
- Manifest V3 禁止内联脚本、`eval()` 和远程执行代码。
- 异步消息监听器延迟响应时必须 `return true`。
- 媒体 URL 只允许 HTTP(S)。
- 使用 DOM API 和 `textContent`，不要拼接不可信 `innerHTML`。
- 工作台、Content Script 和 Background 的消息 action 与响应结构必须同步。
- 每次发布同步更新 `manifest.json`、版本徽标、测试、CHANGELOG 和 RELEASE。

## 下载路径

单媒体：

```text
PicSift/<域名_日期>/<images|videos>/<序号_时间戳>.<扩展名>
```

多图：工作台生成一个 ZIP，资源获取并发数为 4，单资源超时 20 秒，总内容上限 256 MB。

## 调试

- 工作台：打开工作台标签页后按 `F12`。
- Content Script：在来源商品页按 `F12`。
- Service Worker：`chrome://extensions/` → PicSift → Service Worker 检查视图。

修改源文件后必须在扩展管理页重新加载，再刷新工作台。

## 发布

1. 更新版本和文档。
2. 执行完整自动化与手动回归。
3. 生成只包含运行时文件的 ZIP。
4. 校验 ZIP 结构、manifest 版本和 SHA256。
5. 提交、推送并创建同版本 GitHub Release。

详细检查清单见 [TESTING.md](TESTING.md)，发布内容见 [RELEASE.md](RELEASE.md)。
