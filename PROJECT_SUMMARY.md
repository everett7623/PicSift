# PicSift 项目概览

PicSift 是一个无构建步骤、无运行时第三方依赖的 Chrome Manifest V3 扩展。当前版本为 `v0.0.5`。

## 目标

- 从电商商品页提取高清图片和可访问的直链视频。
- 提供尺寸、方向筛选和大图预览。
- 用单个 ZIP 下载多张图片，减少重复保存操作。
- 保持数据本地处理，不引入服务端。

## 组件

| 组件 | 职责 |
| --- | --- |
| `background/background.js` | 打开/复用工作台、恢复来源标签页、单媒体下载 |
| `content/content.js` | 扫描 DOM、元数据和资源，标准化与筛选 URL |
| `popup/popup.js` | 工作台状态、选择、预览、ZIP 生成和来源页通信 |
| `popup/popup.css` | 全屏暗色工作台、自适应网格和交互状态 |
| `manifest.json` | 权限、站点范围和 Manifest V3 入口 |

## 当前能力

- 10 类电商域名范围。
- Alibaba、1688、淘宝、天猫、京东、中国制造网等站点规则优化。
- 图片和直链视频提取。
- 高清 URL 还原、尺寸和比例筛选。
- 大批量结果稳定网格。
- 单张下载、多张图片 ZIP 下载。
- 来源商品页恢复和筛选条件持久化。
- HTTP(S) URL、文件名和下载数量边界检查。

## 数据流

```text
商品页 → Content Script 扫描 → 工作台筛选/预览 → ZIP 或 Background 下载
```

工作台和商品页通过 `chrome.tabs.sendMessage()` 通信；单媒体下载通过 Service Worker 调用 `chrome.downloads.download()`。多图 ZIP 直接在工作台本地生成。

## 质量保障

- Node 内置测试覆盖核心纯函数和 Chrome API 交互边界。
- `test.sh` 检查必需文件、manifest、JavaScript 语法和测试结果。
- 发布前执行站点、下载、大批量布局和来源恢复手动回归。

## 文档

- [README](README.md)
- [安装指南](INSTALL.md)
- [使用指南](USAGE.md)
- [测试指南](TESTING.md)
- [发布说明](RELEASE.md)
- [更新日志](CHANGELOG.md)
