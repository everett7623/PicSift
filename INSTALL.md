# PicSift 安装指南

PicSift 当前通过 GitHub Release 或源码目录安装，适用于 Chrome、Edge 等支持 Manifest V3 的 Chromium 浏览器。

## 方式一：安装 Release 包

1. 打开 [PicSift Releases](https://github.com/everett7623/PicSift/releases/latest)。
2. 下载 `PicSift-v0.0.5.zip`。
3. 将 ZIP 解压到长期保留的目录，不要解压到临时目录后再删除。
4. 在地址栏打开：
   - Chrome：`chrome://extensions/`
   - Edge：`edge://extensions/`
5. 开启“开发者模式”。
6. 点击“加载已解压的扩展程序”。
7. 选择包含 `manifest.json` 的解压目录。

Chrome 不能通过双击 ZIP 直接安装未上架扩展，必须先解压。

## 方式二：从源码安装

```bash
git clone https://github.com/everett7623/PicSift.git
cd PicSift
```

在扩展管理页选择该仓库根目录。项目不需要 `npm install` 或编译。

## 固定扩展图标

1. 点击浏览器工具栏的扩展菜单。
2. 找到 PicSift。
3. 点击固定图标。

固定后可直接从商品页打开工作台。

## 更新扩展

### Release 安装

1. 下载并解压新版本。
2. 用新文件替换原目录，或加载一个新的版本目录。
3. 回到扩展管理页，点击 PicSift 卡片上的“重新加载”。
4. 打开工作台，确认左上角版本号已更新。

### Git 安装

```bash
git pull
```

拉取后同样需要在扩展管理页重新加载。

## 安装校验

- 扩展名称显示为“PicSift - 商品图片提取器”。
- 版本显示为 `0.0.5`。
- 工具栏显示绿色 P 图标。
- 点击图标后打开全屏工作台。
- 在支持站点打开时，右上角显示来源域名。

## 常见问题

### “清单文件缺失或不可读取”

选择了错误的目录。应选择直接包含 `manifest.json` 的目录，而不是它的上级目录。

### 点击图标没有打开工作台

1. 在扩展管理页点击“重新加载”。
2. 打开 PicSift 的 Service Worker 检查视图。
3. 确认 `popup/popup.html`、`background/background.js` 存在。

### 显示旧版本号

扩展源码不会自动热更新。替换文件后必须点击“重新加载”，再刷新已经打开的工作台标签页。

### 当前页面不可提取

确认页面域名在 [README 支持站点](README.md#支持站点) 中，并且当前是普通 HTTP(S) 商品页。`chrome://`、浏览器设置页和本地文件页不能提取。

后续操作见 [使用指南](USAGE.md)，开发排查见 [测试指南](TESTING.md)。
