from PIL import Image, ImageDraw, ImageFont
import os

# 配置
sizes = [16, 32, 48, 128]
bg_color = (9, 11, 16)  # #090B10
circle_color = (52, 211, 153)  # #34D399

for size in sizes:
    # 创建图片
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # 绘制圆形
    circle_radius = size // 3
    circle_bbox = [
        size // 2 - circle_radius,
        size // 2 - circle_radius,
        size // 2 + circle_radius,
        size // 2 + circle_radius
    ]
    draw.ellipse(circle_bbox, fill=circle_color)

    # 绘制字母 P
    try:
        font_size = int(size * 0.5)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text = "P"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = (size - text_width) // 2 - bbox[0]
    text_y = (size - text_height) // 2 - bbox[1]

    draw.text((text_x, text_y), text, fill=bg_color, font=font)

    # 保存
    filename = f'icon{size}.png'
    img.save(filename)
    print(f'Generated {filename}')

print('All icons created successfully!')
