# PicSift - 安装测试指南

## 已完成优化

✅ **安全修复**：移除 `innerHTML`，使用 DOM API 防止 XSS
✅ **URL 验证**：添加协议检查，仅允许 HTTP/HTTPS
✅ **代码优化**：改进错误处理和日志输出

---

## 快速安装（3 步）

### 1. 生成图标

由于缺少图标文件，插件暂时无法加载。你有两个选择：

**方案 A：使用图标生成器（推荐）**

```bash
# 打开图标生成器
start icons/create_icons.html
```

在浏览器中会自动下载 4 个图标文件，将它们移动到 `icons/` 目录。

**方案 B：使用占位图标（临时）**

```bash
# 下载或创建简单的 PNG 图标
# 或者暂时注释掉 manifest.json 中的 icons 配置
```

### 2. 加载插件到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择项目根目录：`D:\EvenFrank\Workspace\Plugins\Google\PicSift`

### 3. 测试功能

访问测试网站：
- https://www.alibaba.com（任意商品页）
- https://www.1688.com（任意商品页）

点击浏览器工具栏的 PicSift 图标，点击"提取图片"。

---

## 调试方法

### 调试 Popup

右键点击插件图标 → **检查弹出内容** → Console 标签

### 调试 Content Script

1. 打开目标网页（如 Alibaba.com）
2. 按 `F12` 打开开发者工具
3. Console 标签中查看日志

### 调试 Background Service Worker

1. 访问 `chrome://extensions/`
2. 找到 PicSift 插件卡片
3. 点击 **"Service Worker"** → **"检查视图"**

---

## 常见问题

### ❌ 插件图标不显示

需要在 `icons/` 目录添加以下文件：
- `icon16.png`
- `icon32.png`
- `icon48.png`
- `icon128.png`

### ❌ 点击图标没有反应

检查 `popup/popup.html` 路径是否正确，或查看 Chrome 扩展页面的错误信息。

### ❌ 提取不到图片

1. 检查网站是否在 `manifest.json` 的 `host_permissions` 中
2. 打开 Console 查看错误日志
3. 确认页面已完全加载

### ❌ 下载失败

检查 Chrome 的下载权限设置，或查看 Background Service Worker 的 Console 日志。

---

## 下一步开发

- [ ] 添加更多网站支持（淘宝、京东、eBay）
- [ ] 视频提取功能
- [ ] 图片去重（感知哈希）
- [ ] 导出 URL 列表
- [ ] 自定义文件名模板

需要我帮你实现其中的功能吗？
