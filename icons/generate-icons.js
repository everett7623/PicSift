/**
 * 生成简单的 Base64 PNG 图标
 * 使用 Canvas 绘制并导出为 Base64
 */

function createIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 背景 - 深黑蓝
  ctx.fillStyle = '#090B10';
  ctx.fillRect(0, 0, size, size);

  // 主色圆形 - 薄荷绿
  ctx.fillStyle = '#34D399';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
  ctx.fill();

  // 字母 P - 深色
  ctx.fillStyle = '#090B10';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', size / 2, size / 2);

  return canvas.toDataURL('image/png');
}

// 生成所有尺寸
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const dataUrl = createIcon(size);
  console.log(`=== icon${size}.png ===`);
  console.log(dataUrl);
  console.log('');
});
