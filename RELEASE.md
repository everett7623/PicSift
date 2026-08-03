# PicSift v0.0.6 发布说明

发布日期：2026-08-03

发布状态：Beta

仓库：[everett7623/PicSift](https://github.com/everett7623/PicSift)

## 下载

- [GitHub Release](https://github.com/everett7623/PicSift/releases/tag/v0.0.6)
- Release 资源：`PicSift-v0.0.6.zip`
- SHA256：`3bd4db308b753ef58b99e15aeb3781e5ac457697c9effb6e23b8edeecb910135`

下载后先解压，再从 `chrome://extensions/` 加载包含 `manifest.json` 的目录。

## 本次发布

### 提取后结果规格筛选

- 默认提取门槛调整为 750 × 750。
- 提取完成后可按 750+、800+、1000+、1500+ 即时筛选。
- 可在全部、方图、横图、竖图之间切换，不重新扫描来源页面。
- 显示当前结果数与提取总数，并避免下载被筛掉的隐藏选择。

### Alibaba 提取修复

- 支持页面元数据、已加载资源和内嵌结构化数据中的图片 URL。
- 兼容 Alicdn 新版缩略图后缀。
- 登录或安全验证拦截时显示明确提示。

### 全屏工作台修复

- 工作台刷新、扩展重载后恢复最近使用的来源商品页。
- 避免把工作台自身错误绑定为来源页。
- 移除固定最小窗口尺寸，补充响应式布局。
- 修复上百张图片时网格行被压缩、卡片重叠的问题。

### ZIP 打包下载

- 两张及以上图片在浏览器本地生成单个 ZIP。
- 只触发一次浏览器下载。
- 失败图片保持选择，支持减少数量后重试。
- 设置 20 秒单资源超时和 256 MB 总大小上限。

### 文档与开源发布

- 完善 README、安装、使用、测试、发布和更新日志。
- 增加当前工作台项目截图。
- 增加 MIT License。
- 发布仓库改为 Public。

## 安装包内容

```text
manifest.json
background/background.js
content/content.js
popup/popup.html
popup/popup.css
popup/popup.js
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
```

发布 ZIP 只包含运行扩展所需文件，不包含测试、源码生成器和开发文档。

## 已知限制

- 商品页面结构变化可能导致特定站点选择器失效。
- 登录、验证码或地区访问限制必须由用户在来源页处理。
- 图片服务器拒绝跨域请求时，部分文件无法加入 ZIP。
- M3U8、DASH、DRM 等流媒体暂不支持。
- 当前版本未上架 Chrome Web Store，需要开发者模式安装。

完整版本历史见 [CHANGELOG.md](CHANGELOG.md)。
