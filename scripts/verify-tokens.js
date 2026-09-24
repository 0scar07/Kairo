// Comprueba que cada token del tema usado en el código exista (colors.x, spacing.x, sizes.x, fontSizes.x…).
// Un token inexistente no rompe la compilación: da `undefined` y el estilo se ignora en silencio.
// Uso: npm run verify
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

// Claves de `export const <name> = { ... }` (incluye claves de objetos anidados: comprobación permisiva)
function keysOf(src, name) {
  const start = src.indexOf(`export const ${name} =`);
  if (start < 0) throw new Error(`No se encontró "${name}" en el tema`);
  const open = src.indexOf("{", start);
  let depth = 0, end = open;
  for (; end < src.length; end++) {
    if (src[end] === "{") depth++;
    if (src[end] === "}" && --depth === 0) break;
  }
  return new Set([...src.slice(open, end).matchAll(/([A-Za-z_]\w*)\s*:/g)].map(m => m[1]));
}

const colorsSrc = read("src/theme/colors.js");
const typographySrc = read("src/theme/typography.js");
const spacingSrc = read("src/theme/spacing.js");

const tokens = {
  colors: keysOf(colorsSrc, "colors"),
  accents: new Set(["brand", ...fs.readdirSync(path.join(ROOT, "src/games"))]),   // los juegos aportan su acento
  fontSizes: keysOf(typographySrc, "fontSizes"),
  fonts: keysOf(typographySrc, "fonts"),
  type: keysOf(typographySrc, "type"),
  tracking: keysOf(typographySrc, "tracking"),
  lineHeights: keysOf(typographySrc, "lineHeights"),
  spacing: keysOf(spacingSrc, "spacing"),
  radii: keysOf(spacingSrc, "radii"),
  sizes: keysOf(spacingSrc, "sizes"),
};

const files = [path.join(ROOT, "App.jsx")];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (!p.endsWith(path.join("src", "theme"))) walk(p); }
    else if (/\.jsx?$/.test(f)) files.push(p);
  }
})(path.join(ROOT, "src"));

let problems = 0;
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  for (const [name, set] of Object.entries(tokens)) {
    for (const m of src.matchAll(new RegExp(`\\b${name}\\.(\\w+)`, "g"))) {
      if (!set.has(m[1])) { console.log(`✖ ${path.relative(ROOT, file)}: ${name}.${m[1]} no existe`); problems++; }
    }
  }
}

console.log(problems ? `${problems} token(s) inexistente(s)` : `OK: todos los tokens del tema existen (${files.length} archivos)`);
process.exit(problems ? 1 : 0);
