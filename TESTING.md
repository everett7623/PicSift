# PicSift 测试指南

## 快速开始

### 1. 加载插件

```bash
# 打开 Chrome
chrome://extensions/

# 操作步骤
1. 开启"开发者模式"（右上角开关）
2. 点击"加载已解压的扩展程序"
3. 选择项目目录: D:\EvenFrank\Workspace\Plugins\Google\PicSift
4. 确认插件已成功加载
```

### 2. 测试图片提取

#### 测试站点
- https://www.alibaba.com/product-detail/xxx（任意商品）
- https://detail.1688.com/offer/xxx.html
- https://item.taobao.com/item.htm?id=xxx
- https://item.jd.com/xxx.html

#### 测试步骤
1. 访问测试站点
2. 点击浏览器工具栏的 PicSift 图标
3. 设置筛选条件：
   - 最小宽度: 800px
   - 最小高度: 800px
   - 勾选"方图"或"横图"
4. 点击"提取图片"
5. 等待提取完成
6. 检查提取的图片数量和质量
7. 选择部分图片
8. 点击"下载选中内容"

#### 预期结果
- ✅ 提取到主图和详情图
- ✅ 图片尺寸符合筛选条件
- ✅ 高清原图（无缩略图模糊）
- ✅ 自动过滤 Logo 和小图标
- ✅ 下载到 `PicSift/域名_日期/images/` 目录

### 3. 测试视频提取

#### 测试站点
- https://www.alibaba.com（带视频的商品页）
- https://detail.1688.com（带视频的商品页）

#### 测试步骤
1. 访问带视频的商品页
2. 点击 PicSift 图标
3. 切换到"视频"标签
4. 点击"提取视频"
5. 选择视频
6. 点击"下载选中内容"

#### 预期结果
- ✅ 提取到商品视频
- ✅ 视频缩略图显示正常
- ✅ 下载到 `PicSift/域名_日期/videos/` 目录

---

## 调试方法

### 调试 Popup（弹窗）

```bash
# 方法 1
右键点击插件图标 → "检查弹出内容"

# 方法 2
打开插件后，按 F12
```

**查看日志**：
- Console 标签查看 `console.log()` 输出
- 检查网络请求
- 查看 DOM 结构

### 调试 Content Script（内容脚本）

```bash
# 在目标网页上
1. 打开商品页面（如 Alibaba.com）
2. 按 F12 打开开发者工具
3. Console 标签查看日志
```

**测试命令**：
```javascript
// 在 Console 中手动测试提取函数
extractImages({ minWidth: 800, minHeight: 800 })
  .then(images => console.log('提取到图片:', images));

extractVideos()
  .then(videos => console.log('提取到视频:', videos));
```

### 调试 Background Service Worker

```bash
chrome://extensions/

# 操作步骤
1. 找到 PicSift 插件卡片
2. 点击"Service Worker"旁的"检查视图"
3. Console 标签查看下载日志
```

---

## 常见问题排查

### ❌ 插件无法加载

**症状**：点击"加载已解压的扩展程序"后报错

**排查**：
```bash
# 检查 manifest.json 是否有语法错误
cd D:/EvenFrank/Workspace/Plugins/Google/PicSift
cat manifest.json | python -m json.tool

# 检查图标文件是否存在
ls icons/*.png
```

### ❌ 点击图标没有反应

**症状**：点击浏览器工具栏图标无弹窗

**排查**：
1. 检查 `popup/popup.html` 路径是否正确
2. 打开 `chrome://extensions/` 查看错误信息
3. 查看 Popup 的 Console（右键图标 → 检查弹出内容）

### ❌ 提取不到图片

**症状**：点击"提取图片"后显示"找到 0 张图片"

**排查**：
```javascript
// 在商品页面 Console 中执行
console.log('hostname:', window.location.hostname);
console.log('img 数量:', document.querySelectorAll('img').length);

// 检查 host_permissions 是否包含当前网站
```

**解决方案**：
1. 检查 `manifest.json` 中的 `host_permissions` 是否包含当前网站
2. 检查 `content_scripts` 的 `matches` 规则
3. 重新加载插件（chrome://extensions/ → 刷新按钮）

### ❌ 下载失败

**症状**：点击"下载选中内容"后无反应或报错

**排查**：
1. 打开 Background Service Worker Console
2. 查看下载错误日志
3. 检查图片 URL 是否可访问（跨域问题）
4. 检查 Chrome 下载权限设置

**解决方案**：
```javascript
// 手动测试下载
chrome.downloads.download({
  url: 'https://example.com/image.jpg',
  filename: 'test.jpg'
});
```

### ❌ 提取到的是缩略图

**症状**：下载的图片模糊或尺寸小

**排查**：
```javascript
// 在 Content Script Console 中测试
const testUrl = 'https://sc04.alicdn.com/kf/H123_300x300.jpg';
console.log('原始 URL:', testUrl);
console.log('高清 URL:', getHighResUrl(testUrl));
```

**解决方案**：
检查 `content.js` 中的 `getHighResUrl()` 函数是否正确处理当前网站的图片 URL。

---

## 性能测试

### 测试场景

| 场景 | 图片数量 | 预期耗时 | 内存占用 |
|------|----------|----------|----------|
| 小型商品页 | 10-20 张 | < 3 秒 | < 50MB |
| 中型商品页 | 50-100 张 | < 10 秒 | < 100MB |
| 大型商品页 | 200+ 张 | < 30 秒 | < 200MB |

### 性能指标

```javascript
// 在 Popup Console 中测试
console.time('extractImages');
// 点击"提取图片"
console.timeEnd('extractImages');
```

---

## 回归测试清单

### 功能测试
- [ ] 图片提取（Alibaba、1688、淘宝、京东）
- [ ] 视频提取（Alibaba、1688、淘宝）
- [ ] 图片筛选（尺寸、比例）
- [ ] 全选/取消全选
- [ ] 批量下载
- [ ] 文件夹自动创建
- [ ] Tab 切换（图片/视频）

### 边界测试
- [ ] 页面无图片时
- [ ] 页面无视频时
- [ ] 筛选条件过严（无匹配结果）
- [ ] 选中 0 个项目时点击下载
- [ ] 下载超过 100 个文件

### 兼容性测试
- [ ] 不同网站（10+ 个电商网站）
- [ ] 不同图片格式（JPG、PNG、WebP）
- [ ] 懒加载图片
- [ ] 背景图片
- [ ] 动态加载内容

### 安全测试
- [ ] XSS 防护（恶意图片 URL）
- [ ] 协议验证（data:、javascript:）
- [ ] 文件名安全（特殊字符）

---

## 发布前检查

### 代码检查
```bash
# 检查 JavaScript 语法错误
cd D:/EvenFrank/Workspace/Plugins/Google/PicSift
node -c content/content.js
node -c popup/popup.js
node -c background/background.js

# 检查 manifest.json
cat manifest.json | python -m json.tool
```

### 文件检查
```bash
# 确认所有必需文件存在
ls manifest.json
ls icons/*.png
ls popup/*.{html,js,css}
ls content/content.js
ls background/background.js
```

### 版本信息
```bash
# 检查版本号一致性
grep version manifest.json
grep "v1.0.0" CHANGELOG.md
```

### 文档检查
- [ ] README.md 更新
- [ ] CHANGELOG.md 完整
- [ ] CLAUDE.md 准确
- [ ] INSTALL.md 清晰

---

## 打包发布

### Chrome Web Store 打包

```bash
# 创建 ZIP 文件
cd D:/EvenFrank/Workspace/Plugins/Google/PicSift
zip -r PicSift-v1.0.0.zip . -x "*.git*" "*.py" "*.base64" "*.md" "node_modules/*"

# 或使用 Chrome 打包
# chrome://extensions/ → "打包扩展程序"
```

### 发布清单
- [ ] 插件名称：PicSift - 商品图片提取器
- [ ] 版本号：1.0.0
- [ ] 分类：生产力工具
- [ ] 隐私政策：本地处理，无数据上传
- [ ] 权限说明：activeTab（访问当前页面）、downloads（下载文件）

---

需要执行测试吗？告诉我你想测试哪个功能。
