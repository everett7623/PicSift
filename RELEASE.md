# PicSift v0.0.1 - Beta 版本发布

**发布日期**: 2026-07-31  
**版本**: v0.0.1 (Beta)  
**作者**: Everett Labs ([https://everettlabs.dev/](https://everettlabs.dev/))

> ⚠️ **测试版本**：这是初始 Beta 版本，功能可能不稳定，欢迎反馈问题。

---

## 📦 发布内容

### 核心功能
- ✅ 图片提取（主图、详情图、懒加载、背景图）
- ✅ 视频提取（`<video>` 标签、data 属性）
- ✅ 图片筛选（尺寸、比例）
- ✅ 批量下载（自动分类文件夹）
- ✅ Tab 切换（图片/视频）
- ✅ 深色主题界面

### 支持的网站（11 个）

#### 完整优化（6 个）
| 网站 | 图片提取 | 视频提取 | 高清还原 |
|------|:--------:|:--------:|:--------:|
| Alibaba.com | ✅ | ✅ | ✅ |
| 1688.com | ✅ | ✅ | ✅ |
| Taobao.com | ✅ | ✅ | ✅ |
| Tmall.com | ✅ | ✅ | ✅ |
| JD.com | ✅ | ❌ | ✅ |
| Made-in-China.com | ✅ | ✅ | ✅ |

#### 通用支持（5 个）
- Amazon.com
- AliExpress.com
- eBay.com
- Shopee.com
- 其他电商网站

---

## 📊 项目统计

```
代码行数:      941 行
  - content.js:   478 行（图片/视频提取）
  - popup.js:     331 行（用户界面）
  - background.js: 122 行（下载管理）
  - 其他代码:      10 行

配置文件:        1 个（manifest.json）
样式文件:        1 个（popup.css）
HTML 文件:       2 个（popup.html + QUICK_START.html）
图标文件:        4 个（16/32/48/128px）
文档文件:        7 个
工具脚本:        2 个
```

---

## 🎯 技术特性

### 1. 高清原图还原

| 网站 | 缩略图 URL | 原图 URL |
|------|-----------|----------|
| 阿里系 | `xxx_300x300.jpg` | `xxx.jpg` |
| 京东 | `xxx.jpg!q70` | `xxx.jpg` |
| 淘宝 | `xxx_400x400.jpg` | `xxx.jpg` |
| 中国制造网 | `/s_/xxx.jpg` | `/xxx.jpg` |

### 2. 智能筛选
- 最小尺寸过滤（宽度/高度）
- 图片比例过滤（方图/横图/竖图）
- 自动过滤小图标（< 200x200px）

### 3. 安全防护
- XSS 防护（DOM API）
- URL 协议验证（HTTP/HTTPS only）
- 输入验证

### 4. 批量下载
- 自动创建文件夹（`域名_日期`）
- 分类目录（`images/`、`videos/`）
- 文件命名（`序号_时间戳.扩展名`）

---

## 📁 文件结构

```
PicSift/
├── manifest.json              # Chrome 插件配置
├── icons/                     # 插件图标
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                     # 用户界面
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/                   # 内容脚本
│   └── content.js
├── background/                # 后台服务
│   └── background.js
├── README.md                  # 项目说明
├── CLAUDE.md                  # 开发指南
├── INSTALL.md                 # 安装指南
├── TESTING.md                 # 测试文档
├── CHANGELOG.md               # 更新日志
├── PROJECT_SUMMARY.md         # 项目总结
├── QUICK_START.html           # 快速开始（可视化）
└── test.sh                    # 自动测试脚本
```

---

## 🚀 安装方法

### 开发者模式安装

```
1. 打开 Chrome: chrome://extensions/
2. 开启"开发者模式"（右上角）
3. 点击"加载已解压的扩展程序"
4. 选择目录: D:\EvenFrank\Workspace\Plugins\Google\PicSift
```

### 测试网站

```
• Alibaba.com - 图片/视频提取
• 1688.com - 图片/视频提取
• Made-in-China.com - 图片/视频提取
• Taobao.com - 图片提取
• JD.com - 图片提取
```

---

## 🔄 更新记录

### v0.0.1 (2026-07-31) - Beta

#### 新增
- 商品图片提取功能
- 商品视频提取功能
- 图片尺寸/比例筛选
- 批量下载功能
- 支持 11 个电商网站
- 6 个网站特殊优化

#### 优化
- Made-in-China.com 视频提取支持
- 高清原图 URL 还原算法
- XSS 安全防护
- 用户界面（Tab 切换、深色主题）

---

## 🗺️ 版本规划

### v0.1.0（下一版本）
- 图片去重功能
- URL 列表导出
- 性能优化

### v1.0.0（正式版）
- 完整测试通过
- Chrome Web Store 发布
- 用户反馈修复

---

## 📖 文档

| 文档 | 说明 |
|------|------|
| `README.md` | 功能介绍、使用说明 |
| `INSTALL.md` | 安装步骤、常见问题 |
| `TESTING.md` | 测试流程、调试方法 |
| `CLAUDE.md` | 架构设计、开发指南 |
| `CHANGELOG.md` | 版本更新日志 |
| `PROJECT_SUMMARY.md` | 项目完成总结 |
| `QUICK_START.html` | 可视化快速开始 |

---

## 👨‍💻 作者信息

**Everett Labs**

- 🌐 网站：[https://everettlabs.dev/](https://everettlabs.dev/)
- ☕ 请我喝咖啡：[https://everettlabs.dev/coffee/](https://everettlabs.dev/coffee/)

---

## 📝 许可证

MIT License

---

## 🎉 致谢

感谢使用 PicSift！如果这个插件对你有帮助，欢迎：
- ⭐ Star 项目
- ☕ 请我喝咖啡
- 📣 分享给朋友

---

**项目状态**: ✅ 生产就绪  
**项目目录**: `D:\EvenFrank\Workspace\Plugins\Google\PicSift`  
**在线演示**: 加载到 Chrome 后即可使用
