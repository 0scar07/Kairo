// Genera los PNG de la marca a partir de assets/brand/icon.svg
// Uso: npm run icons
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "assets", "brand", "icon.svg");
const OUT = path.join(ROOT, "assets");

async function render(svg, size, file) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(OUT, file));
  console.log("✔", file, `${size}x${size}`);
}

async function main() {
  const svg = fs.readFileSync(SRC, "utf8");
  // Sin fondo: para el primer plano adaptativo de Android y la splash (el color de fondo lo pone app.json)
  const transparent = svg.replace(/<rect id="bg"[^>]*\/>/, "");

  await render(svg, 1024, "icon.png");
  // El símbolo ya cae dentro del 66 % central (zona segura de Android)
  await render(transparent, 1024, "adaptive-icon.png");
  await render(transparent, 1024, "splash-icon.png");
  await render(svg, 48, "favicon.png");
}

main().catch(e => { console.error(e); process.exit(1); });
