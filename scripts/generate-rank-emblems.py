"""Descarga los emblemas de rango de Community Dragon (mismos assets del cliente de LoL),
recorta el margen transparente y los deja en assets/ranks/<tier>.png (256 px de ancho).

Uso: python scripts/generate-rank-emblems.py   (requiere Pillow)
"""
import io
import os
import urllib.request
from PIL import Image

BASE = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem"
TIERS = ["iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"]
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "ranks")
WIDTH = 256

os.makedirs(OUT, exist_ok=True)
images = {}
for tier in TIERS:
    req = urllib.request.Request(f"{BASE}/emblem-{tier}.png", headers={"User-Agent": "kairo-build-script"})
    with urllib.request.urlopen(req) as r:
        images[tier] = Image.open(io.BytesIO(r.read())).convert("RGBA")

# Cada emblema viene en un lienzo enorme y con tamaños muy distintos: se recorta a su caja y se
# ajusta ("contain") a un lienzo común de WIDTH x HEIGHT, centrado.
HEIGHT = 224
for tier, img in images.items():
    box = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    crop = img.crop(box)
    scale = min(WIDTH / crop.width, HEIGHT / crop.height)
    crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    canvas.paste(crop, ((WIDTH - crop.width) // 2, (HEIGHT - crop.height) // 2), crop)
    canvas.save(os.path.join(OUT, f"{tier}.png"), optimize=True)
    print(tier, "ok")
