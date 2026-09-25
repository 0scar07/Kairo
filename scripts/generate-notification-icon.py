"""Genera assets/notification-icon.png: la K de la marca en blanco sobre transparente (96x96).

Android exige que el ícono pequeño de una notificación sea una silueta: usa solo el canal alfa y lo pinta con el color de
acento. Los trazos son los mismos de assets/brand/icon.svg (tallo y dos brazos, extremos redondeados).

Uso: python scripts/generate-notification-icon.py   (requiere Pillow)
"""
from PIL import Image, ImageDraw

SCALE = 4                 # dibujo a 4x y reducción para bordes suaves
BASE = 1024 * SCALE
STROKE = 96 * SCALE
SEGMENTS = [((372, 290), (372, 734)), ((372, 520), (664, 290)), ((480, 500), (668, 734))]   # coordenadas del SVG
OUT = 96
PAD = 8                   # margen dentro del lienzo final

canvas = Image.new("L", (BASE, BASE), 0)
draw = ImageDraw.Draw(canvas)
r = STROKE // 2
for (x1, y1), (x2, y2) in SEGMENTS:
    p1, p2 = (x1 * SCALE, y1 * SCALE), (x2 * SCALE, y2 * SCALE)
    draw.line([p1, p2], fill=255, width=STROKE)
    for x, y in (p1, p2):   # extremos redondeados
        draw.ellipse([x - r, y - r, x + r, y + r], fill=255)

box = canvas.getbbox()
glyph = canvas.crop(box)
side = OUT - 2 * PAD
ratio = min(side / glyph.width, side / glyph.height)
glyph = glyph.resize((max(1, round(glyph.width * ratio)), max(1, round(glyph.height * ratio))), Image.LANCZOS)

alpha = Image.new("L", (OUT, OUT), 0)
alpha.paste(glyph, ((OUT - glyph.width) // 2, (OUT - glyph.height) // 2))
icon = Image.new("RGBA", (OUT, OUT), (255, 255, 255, 0))
icon.putalpha(alpha)
icon.save("assets/notification-icon.png")
print("assets/notification-icon.png", icon.size)
