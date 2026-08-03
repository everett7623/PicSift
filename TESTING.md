# PicSift 测试指南

## 自动化检查

项目无安装和构建步骤。在仓库根目录执行：

```bash
node --check content/content.js
node --check popup/popup.js
node --check background/background.js
node --test tests/*.test.js
python -m json.tool manifest.json
bash test.sh
```

Windows PowerShell 可使用 Git Bash：

```powershell
& 'C:\Program Files\Git\bin\bash.exe' test.sh
```

自动化测试覆盖 URL 标准化、高清图后缀、筛选、ZIP 结构、CRC32、文件名、来源标签页恢复和版本一致性。

## 本地加载

1. 打开 `chrome://extensions/`。
2. 启用开发者模式。
3. 加载仓库根目录。
4. 每次修改后点击扩展卡片上的“重新加载”。
5. 关闭或刷新旧工作台，确认左上角版本号正确。

## 手动回归矩阵

| 场景 | 站点 | 重点验证 |
| --- | --- | --- |
| Alibaba 新版商品页 | `www.alibaba.com/product-detail/...` | 元数据、Alicdn 高清图、访问拦截提示 |
| 1688 商品页 | `detail.1688.com/offer/...` | 主图、详情图、直链视频 |
| 淘宝/天猫 | 商品详情页 | 懒加载主图、缩略图后缀 |
| 京东 | `item.jd.com/...` | 高清 URL、尺寸筛选 |
| 中国制造网 | 商品详情页 | 模板图和直链视频 |
| 通用站点 | Amazon/eBay/Shopee | 可见 DOM、背景图、异常 URL |

## 核心流程

### 图片提取

- [ ] 来源站点徽标显示正确域名。
- [ ] 默认筛选值可编辑并在重开工作台后恢复。
- [ ] 未选择比例时保留所有方向。
- [ ] 多个比例同时选择时采用“任意匹配”。
- [ ] 提取后尺寸和比例规格即时过滤，不重新扫描来源页。
- [ ] 结果规格计数显示“当前结果 / 提取总数”。
- [ ] 图片数量、卡片尺寸信息和结果计数一致。
- [ ] 单击切换选择，双击打开预览。
- [ ] 全选和取消操作状态正确。

### 大批量结果

- [ ] 结果超过 100 张时卡片不重叠。
- [ ] 网格在 520px、700px、1600px 断点附近正常换列。
- [ ] 滚动条只出现在结果区域，底部下载栏保持可见。
- [ ] 透明图、横图和竖图使用 `contain` 完整显示。

建议使用曾经返回 151 张结果的 Alibaba 页面进行回归。

### 下载

- [ ] 单张图片触发一次普通下载。
- [ ] 两张以上图片只触发一次 ZIP 下载。
- [ ] ZIP 可正常解压，文件数量和成功数量一致。
- [ ] 部分图片失败时状态栏显示成功/失败数量。
- [ ] 失败图片保持选中，可再次尝试。
- [ ] ZIP 超过 256 MB 时显示明确错误。
- [ ] 视频仍按单文件批量下载，不进入图片 ZIP。

### 来源页恢复

- [ ] 从商品页点击图标后工作台绑定正确来源标签页。
- [ ] 刷新工作台后仍可提取。
- [ ] 重载扩展后能恢复最近使用的受支持商品页。
- [ ] 在工作台内重复点击扩展图标不会把工作台自身当作来源。
- [ ] 来源页关闭后显示可操作的错误提示。

## 边界与安全

- [ ] 空页面显示空状态，不抛异常。
- [ ] `data:`、`javascript:`、`blob:` 等不受支持 URL 被拒绝。
- [ ] 相对 URL 和 `//host/path` 能正确解析。
- [ ] 特殊字符不会进入下载文件名。
- [ ] 超过 500 个单文件下载项被限制。
- [ ] Alibaba 登录或安全验证页返回明确错误。
- [ ] 页面内容不能通过媒体标题注入 HTML。

## 调试入口

### 工作台

在工作台标签页按 `F12`，检查 Console、Network 和 DOM。

### Content Script

在来源商品页按 `F12`。重点检查当前域名、图片数量和内容脚本错误。

### Background Service Worker

进入 `chrome://extensions/`，在 PicSift 卡片中点击 Service Worker 的“检查视图”。

## 发布前检查

- [ ] `manifest.json`、工作台版本徽标和测试断言一致。
- [ ] README、USAGE、INSTALL、RELEASE、CHANGELOG 已更新。
- [ ] 工作台截图反映当前 UI。
- [ ] 自动化检查全部通过。
- [ ] Release ZIP 根目录直接包含 `manifest.json`。
- [ ] ZIP 内图标路径为 `icons/icon*.png`。
- [ ] ZIP SHA256 已写入发布说明。
- [ ] GitHub Release 标签与 manifest 版本一致。
