# 图标

`manifest.json` 引用四个尺寸，缺任何一个都会导致扩展加载失败，`test.sh` 也会检查它们是否存在：

`icon16.png`、`icon32.png`、`icon48.png`、`icon128.png`

## 设计规格

| 项 | 值 |
| --- | --- |
| 背景 | 深黑蓝 `#090B10` |
| 主色 | 薄荷绿 `#34D399` |
| 图案 | 居中圆形内嵌字母 P（半径为边长的 1/3，字号为边长的 0.5） |
| 风格 | 简洁、专业、科技感 |

## 重新生成

```bash
python icons/generate_icons.py
```

需要 Pillow：`pip install Pillow`。脚本会按上表规格覆盖四个 PNG。修改设计时同步更新本文件的规格表。
