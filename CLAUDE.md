# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**PicSift** 是一个 Chrome 浏览器插件，用于从电商网站提取和批量下载商品图片和视频。

**当前版本**: v1.0.0

**支持网站**: Alibaba.com、1688、淘宝、天猫、京东、Amazon、AliExpress、eBay、Shopee 等。

**核心功能**:
- 图片提取（主图、详情图、懒加载）
- 视频提取（`<video>` 标签、data 属性）
- 图片筛选（尺寸、比例）
- 批量下载（自动分类文件夹）

## 开发命令

### 安装与测试

```bash
# 加载插件到 Chrome
1. 打开 chrome://extensions/
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录

# 重新加载插件（修改代码后）
点击 chrome://extensions/ 中插件卡片上的"重新加载"按钮
```

### 调试

```bash
# 调试 Popup（弹窗）
右键点击插件图标 → 检查弹出内容

# 调试 Content Script（内容脚本）
在目标网页按 F12 → Console 标签

# 调试 Background Service Worker
chrome://extensions/ → 插件详情 → Service Worker → 检查视图
```

## 架构设计

### Chrome Extension Manifest V3 架构

```
┌─────────────┐
│   Popup     │  用户界面，Tab 切换（图片/视频），筛选器，下载按钮
│ (popup.js)  │
└──────┬──────┘
       │ chrome.tabs.sendMessage()
       ↓
┌─────────────┐
│   Content   │  注入到网页，提取 <img>、<video> 和背景图片
│ (content.js)│  支持阿里系、淘宝、京东等网站的特殊选择器
└──────┬──────┘
       │ chrome.runtime.sendMessage()
       ↓
┌─────────────┐
│ Background  │  Service Worker，处理批量下载
│(background  │  生成文件夹名称（域名+日期+类型）
│    .js)     │  分离 images/ 和 videos/ 目录
└─────────────┘
```

### 核心数据流

1. **用户点击"提取图片"** → Popup 向 Content Script 发送消息
2. **Content Script 扫描页面** → 提取 `<img>` 标签、背景图片、阿里系特定元素
3. **高清 URL 转换** → 移除缩略图参数（`_300x300.jpg` → 原图）
4. **筛选过滤** → 按尺寸、比例过滤，排除小图标
5. **返回 Popup** → 渲染图片网格，用户选择
6. **批量下载** → Popup 通知 Background，Background 调用 `chrome.downloads.download()`

## 关键技术点

### 1. 阿里系图片 URL 处理

```javascript
// 原始 URL（缩略图）
https://sc04.alicdn.com/kf/H123_300x300.jpg

// 高清原图
https://sc04.alicdn.com/kf/H123.jpg
```

在 `content.js` 的 `getHighResUrl()` 中实现，移除 `_数字x数字` 后缀和查询参数。

### 2. 图片尺寸获取

使用 `Image()` 对象加载图片获取 `naturalWidth` 和 `naturalHeight`，避免 CSS 缩放影响。

### 3. 懒加载图片识别

检查 `img.dataset.src`、`img.dataset.original` 等属性。

### 4. 消息传递机制

- **Popup → Content**: `chrome.tabs.sendMessage(tabId, message)`
- **Content/Popup → Background**: `chrome.runtime.sendMessage(message)`
- **异步响应**: 监听器中 `return true` 保持消息通道开启

### 5. 文件夹命名规则

```javascript
// 格式: PicSift/域名_日期/序号_时间戳.扩展名
PicSift/alibaba.com_2026-07-31/001_1722412345678.jpg
```

## 文件职责

| 文件 | 职责 |
|------|------|
| `manifest.json` | 插件配置、权限声明、Content Script 匹配规则 |
| `popup/popup.js` | 用户交互、提取触发、图片选择、下载触发 |
| `popup/popup.html` | 弹窗 UI 结构（筛选器、图片网格、按钮） |
| `popup/popup.css` | 深色主题样式（薄荷绿 `#34D399` 主色） |
| `content/content.js` | 页面注入逻辑、图片提取、阿里系特殊处理 |
| `background/background.js` | Service Worker、批量下载、文件命名 |

## 注意事项

### 安全性

- **XSS 风险**: `popup.js` 中使用 `innerHTML` 渲染图片时，URL 未做转义。建议改用 DOM API（`createElement`、`textContent`）或使用 DOMPurify。
- **URL 验证**: 提取的图片 URL 应验证是否为合法 HTTP/HTTPS 协议。

### 权限

- `activeTab`: 仅在用户点击插件时访问当前标签页
- `downloads`: 批量下载文件
- `storage`: 预留（未来保存用户偏好设置）
- `host_permissions`: 限制在已声明的电商网站

### Manifest V3 限制

- **Service Worker 生命周期短**: Background 脚本可能随时休眠，不要依赖全局变量持久化状态
- **Content Security Policy**: 不能使用 `eval()`、内联脚本，所有 JS 必须独立文件

## 扩展开发方向

### 短期（V1.1-1.2）

- 添加视频提取（`<video>` 标签、M3U8 流）
- 支持更多电商网站（eBay、淘宝、京东）
- 导出图片 URL 列表（TXT/CSV）

### 中期（V1.3-1.5）

- SKU 图片分类（按颜色/款式）
- 自定义下载文件名模板
- ZIP 打包下载
- 图片去重（感知哈希）

### 长期（V2.0+）

- 商品标题、价格、参数提取
- 多语言支持（英文界面）
- 云端同步下载历史
- 与外贸 ERP 集成

## 常见问题

### 插件图标未显示

需要在 `icons/` 目录添加 16x16、32x32、48x48、128x128 四个尺寸的 PNG 图标。

### Content Script 未注入

检查 `manifest.json` 中的 `matches` 规则是否匹配当前网站 URL。

### 下载失败

1. 检查 `downloads` 权限是否已声明
2. 图片 URL 是否支持跨域访问
3. 文件名是否包含非法字符（Windows 不支持 `<>:"/\|?*`）

### 图片重复

`content.js` 中使用 `Set` 去重，基于完整 URL。如需更智能去重，可引入感知哈希算法。
