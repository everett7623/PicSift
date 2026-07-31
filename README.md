# PicSift · 商品图片提取器

> **当前版本**: v0.0.1 (Beta)

一款面向外贸、电商和产品运营人员的网页商品图片和视频提取工具。

## 功能特性

- ✅ 从多个电商网站提取商品图片和视频
- ✅ 支持网站：Alibaba.com、1688、淘宝、天猫、京东、Amazon、AliExpress、eBay、Shopee 等
- ✅ 自动识别主图、详情图和懒加载图片
- ✅ 智能还原高清原图地址
- ✅ 支持图片尺寸筛选（最小宽度/高度）
- ✅ 支持图片比例筛选（方图/横图/竖图）
- ✅ 支持视频提取（`<video>` 标签、data 属性）
- ✅ 批量下载，自动按"域名+日期+类型"创建文件夹
- ✅ 自动过滤小图标、Logo 和装饰图片

## 安装方法

### 开发者模式安装

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `PicSift` 项目根目录
5. 插件安装完成

## 使用说明

### 提取图片

1. 打开任意电商商品页面
2. 点击浏览器工具栏中的 PicSift 图标
3. 设置筛选条件（可选）：
   - 最小宽度/高度
   - 图片比例（方图/横图/竖图）
4. 点击"提取图片"按钮
5. 选择需要下载的图片（支持单选/全选）
6. 点击"下载选中内容"

### 提取视频

1. 打开商品页面
2. 点击 PicSift 图标
3. 切换到"视频"标签
4. 点击"提取视频"按钮
5. 选择需要下载的视频
6. 点击"下载选中内容"

## 项目结构

```
PicSift/
├── manifest.json          # Chrome 插件配置文件
├── background/
│   └── background.js      # Service Worker（处理下载）
├── content/
│   └── content.js         # Content Script（注入页面提取图片/视频）
├── popup/
│   ├── popup.html         # 弹窗界面
│   ├── popup.js           # 弹窗逻辑
│   └── popup.css          # 弹窗样式
└── icons/                 # 插件图标
```

## 技术栈

- Chrome Extension Manifest V3
- Vanilla JavaScript
- CSS Grid Layout

## 支持的网站

### 完整支持（特殊选择器优化）
- Alibaba.com
- 1688.com
- 淘宝 (Taobao.com)
- 天猫 (Tmall.com)
- 京东 (JD.com)

### 通用支持
- Amazon.com
- AliExpress.com
- eBay.com
- Shopee.com
- 其他电商网站（通用提取）

## 后续计划

- [ ] 图片去重（感知哈希）
- [ ] 导出图片 URL 列表（CSV）
- [ ] 自定义文件名模板
- [ ] ZIP 打包下载
- [ ] 商品标题和参数提取
- [ ] M3U8 视频流下载

## 许可证

MIT License

---

## 👨‍💻 作者

**Everett Labs**

- 🌐 网站：[https://everettlabs.dev/](https://everettlabs.dev/)
- ☕ 请我喝咖啡：[https://everettlabs.dev/coffee/](https://everettlabs.dev/coffee/)

---

如果这个插件对你有帮助，欢迎支持一杯咖啡 ☕
