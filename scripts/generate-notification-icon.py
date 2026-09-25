"""Genera assets/notification-icon.png: escudo de doble borde con la K de la marca en hueco (96x96, blanco sobre transparente).

Android solo usa el canal alfa del ícono pequeño de una notificación (lo pinta con el color de acento), así que el
detalle se logra con espacio negativo: un anillo exterior, un hueco y el cuerpo del escudo con la K recortada.

Uso: python scripts/generate-notification-icon.py   (requiere Pillow)
"""
import math

from PIL import Image, ImageChops, ImageDraw

S = 384          # se dibuja a 4x y se reduce para bordes suaves
W = 255
SHIELD = [(70, 60), (192, 24), (314, 60), (314, 200), (192, 356), (70, 200)]


def canvas():
    return Image.new("L", (S, S), 0)


def poly(points):
    c = canvas(); ImageDraw.Draw(c).polygon(points, fill=W); return c


def shrink(points, cx, cy, amount):
    out = []
    for x, y in points:
        dx, dy = x - cx, y - cy
        n = math.hypot(dx, dy) or 1
        out.append((x - dx / n * amount, y - dy / n * amount))
    return out


def k_shape(box, sw):
    """La K de assets/brand/icon.svg: tallo y dos brazos con extremos redondeados."""
    c = canvas(); d = ImageDraw.Draw(c)
    x0, y0, x1, y1 = box
    w = x1 - x0
    stem = x0 + w * 0.20
    d.line([(stem, y0), (stem, y1)], fill=W, width=sw)
    d.line([(stem, y0 + (y1 - y0) * 0.52), (x1 - w * 0.06, y0)], fill=W, width=sw)
    d.line([(x0 + w * 0.46, y0 + (y1 - y0) * 0.46), (x1 - w * 0.04, y1)], fill=W, width=sw)
    for px, py in [(stem, y0), (stem, y1), (x1 - w * 0.06, y0), (x1 - w * 0.04, y1)]:
        d.ellipse([px - sw / 2, py - sw / 2, px + sw / 2, py + sw / 2], fill=W)
    return c


outer = poly(SHIELD)
ring = ImageChops.subtract(outer, poly(shrink(SHIELD, 192, 190, 22)))         # anillo exterior
body = ImageChops.add(ring, poly(shrink(SHIELD, 192, 190, 40)))               # cuerpo interior
mask = ImageChops.subtract(body, k_shape((128, 96, 262, 282), 34))            # la K en hueco

icon = Image.new("RGBA", (S, S), (255, 255, 255, 0))
icon.putalpha(mask)
icon.resize((96, 96), Image.LANCZOS).save("assets/notification-icon.png")
print("assets/notification-icon.png (96, 96)")
