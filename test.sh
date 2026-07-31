#!/bin/bash
# PicSift 自动测试脚本

cd "D:/EvenFrank/Workspace/Plugins/Google/PicSift"

echo "════════════════════════════════════════════════════════════"
echo "  PicSift v1.0.0 - 自动测试报告"
echo "════════════════════════════════════════════════════════════"
echo ""

# 1. 文件结构检查
echo "1️⃣  文件结构检查"
echo "────────────────────────────────────────────────────────────"

FILES=(
  "manifest.json"
  "popup/popup.html"
  "popup/popup.js"
  "popup/popup.css"
  "content/content.js"
  "background/background.js"
  "icons/icon16.png"
  "icons/icon32.png"
  "icons/icon48.png"
  "icons/icon128.png"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (缺失)"
  fi
done
echo ""

# 2. JSON 格式检查
echo "2️⃣  JSON 格式检查"
echo "────────────────────────────────────────────────────────────"
if python -m json.tool manifest.json > /dev/null 2>&1; then
  echo "  ✓ manifest.json 格式正确"
else
  echo "  ✗ manifest.json 格式错误"
fi
echo ""

# 3. JavaScript 语法检查
echo "3️⃣  JavaScript 语法检查"
echo "────────────────────────────────────────────────────────────"
if node --check content/content.js 2>&1; then
  echo "  ✓ content.js 语法正确"
else
  echo "  ✗ content.js 语法错误"
fi

if node --check popup/popup.js 2>&1; then
  echo "  ✓ popup.js 语法正确"
else
  echo "  ✗ popup.js 语法错误"
fi

if node --check background/background.js 2>&1; then
  echo "  ✓ background.js 语法正确"
else
  echo "  ✗ background.js 语法错误"
fi
echo ""

# 4. 代码统计
echo "4️⃣  代码统计"
echo "────────────────────────────────────────────────────────────"
echo "  核心代码:"
wc -l content/content.js popup/popup.js background/background.js | tail -1
echo ""

# 5. 文档检查
echo "5️⃣  文档检查"
echo "────────────────────────────────────────────────────────────"
DOCS=("README.md" "CLAUDE.md" "INSTALL.md" "TESTING.md" "CHANGELOG.md" "PROJECT_SUMMARY.md")
for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "  ✓ $doc"
  else
    echo "  ✗ $doc (缺失)"
  fi
done
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ 静态检查完成"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🚀 下一步: 手动测试"
echo ""
echo "1. 加载插件:"
echo "   chrome://extensions/ → 开启开发者模式 → 加载已解压的扩展程序"
echo ""
echo "2. 测试网站:"
echo "   https://www.alibaba.com (图片提取)"
echo "   https://detail.1688.com (视频提取)"
echo ""
echo "3. 调试方法:"
echo "   右键插件图标 → 检查弹出内容"
echo "   目标网页 F12 → Console 查看提取日志"
echo ""
