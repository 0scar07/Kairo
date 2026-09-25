// Comprueba las traducciones sin ejecutar la app:
//  1. Todos los idiomas tienen exactamente las claves de es.js (y las mismas variables {x} en cada texto).
//  2. Toda clave que el código pide con t("...") existe (incluidas las que se arman dinámicamente: regiones,
//     tipos de batalla de Clash Royale, colas, códigos de error del backend…).
//  3. No sobran claves que ningún código use.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const problems = [];
const fail = msg => problems.push(msg);

// --- Diccionarios: se leen como texto ("clave": ...) para no depender de un bundler
const localesDir = path.join(root, "src", "i18n", "locales");
const dicts = {};
for (const file of fs.readdirSync(localesDir).filter(f => f.endsWith(".js"))) {
  const src = fs.readFileSync(path.join(localesDir, file), "utf8");
  const entries = {};
  for (const m of src.matchAll(/^\s*"([\w.]+)":\s*(.+?),?\s*$/gm)) entries[m[1]] = m[2];
  dicts[file.replace(".js", "")] = entries;
}
const es = dicts.es;
if (!es) { console.error("Falta src/i18n/locales/es.js"); process.exit(1); }

const vars = text => [...new Set([...String(text).matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort().join(",");

for (const [lang, dict] of Object.entries(dicts)) {
  if (lang === "es") continue;
  for (const key of Object.keys(es)) {
    if (!(key in dict)) { fail(`[${lang}] falta la clave "${key}"`); continue; }
    // legal.* se copian del inglés (texto oficial): no se comparan variables
    if (!key.startsWith("legal.") && vars(dict[key]) !== vars(es[key])) {
      fail(`[${lang}] "${key}" usa variables distintas: {${vars(dict[key])}} en vez de {${vars(es[key])}}`);
    }
  }
  for (const key of Object.keys(dict)) if (!(key in es)) fail(`[${lang}] sobra la clave "${key}" (no está en es.js)`);
}

// --- Claves usadas en el código
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) { if (name !== "locales") walk(full); }
    else if (/\.jsx?$/.test(name)) files.push(full);
  }
})(path.join(root, "src"));
files.push(path.join(root, "App.jsx"));

const namespaces = [...new Set(Object.keys(es).map(k => k.split(".")[0]))];
const NAMESPACE_RE = new RegExp('"((?:' + namespaces.join("|") + ")\\.[\\w.]+)\"", "g");
const used = new Set();
const addUsed = key => used.add(key);
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/\bt\(\s*"([\w.]+)"/g)) addUsed(m[1]);
  // claves guardadas en constantes o ternarios para traducir después ("queue.normal", "apex.kills"…):
  // cualquier texto entre comillas que empiece por un espacio de nombres conocido
  for (const m of src.matchAll(NAMESPACE_RE)) addUsed(m[1]);
}
// regiones del selector
for (const m of read("src/constants/regions.js").matchAll(/id:\s*"(\w+)"/g)) addUsed(`regions.${m[1]}`);
// tipos de batalla de Clash Royale
const kinds = read("src/games/clashroyale/utils.js").match(/const KINDS = \[([\s\S]*?)\];/);
if (kinds) for (const m of kinds[1].matchAll(/"(\w+)"/g)) addUsed(`cr.kind.${m[1]}`);
// códigos de error del backend (server/**/*.js)
(function walkServer(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "test") continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkServer(full);
    else if (name.endsWith(".js")) for (const m of fs.readFileSync(full, "utf8").matchAll(/(?:code:|notFound\?\.code \|\|)\s*"([A-Z_]+)"/g)) addUsed(`errors.${m[1]}`);
  }
})(path.join(root, "server"));
for (const key of ["errors.network", "errors.timeout", "errors.unexpected", "lol.streakWins", "lol.streakLosses"]) addUsed(key);

// claves armadas al vuelo: medallas de Dota 2, rangos de Apex, modos de Fortnite y de PUBG
for (let i = 1; i <= 8; i++) addUsed(`dota.medal.${i}`);
const apexTiers = read("src/games/apex/utils.js").match(/const TIERS = \{([\s\S]*?)\};/);
if (apexTiers) for (const m of apexTiers[1].matchAll(/:\s*"(\w+)"/g)) addUsed(`apex.tier.${m[1]}`);
const fnModes = read("src/games/fortnite/ProfileBody.jsx").match(/const MODES = \[([^\]]*)\]/);
if (fnModes) for (const m of fnModes[1].matchAll(/"(\w+)"/g)) addUsed(`fn.mode.${m[1]}`);
const pubgModes = read("src/games/pubg/utils.js").match(/MODE_ORDER = \[([^\]]*)\]/);
if (pubgModes) for (const m of pubgModes[1].matchAll(/"([\w-]+)"/g)) addUsed(`pubg.mode.${m[1].replace(/-(\w)/g, (_, c) => c.toUpperCase())}`);

const exists = key => key in es || `${key}_one` in es || `${key}_other` in es;
for (const key of used) if (!exists(key)) fail(`el código usa "${key}" pero no está en es.js`);

// Claves sin uso (los plurales se comparan por su clave base)
const base = key => key.replace(/_(one|other)$/, "");
for (const key of Object.keys(es)) if (!used.has(base(key))) fail(`"${key}" está en es.js pero ningún código la usa`);

// Plurales completos: si hay _one debe haber _other y al revés
for (const [lang, dict] of Object.entries(dicts)) {
  for (const key of Object.keys(dict)) {
    if (key.endsWith("_one") && !(base(key) + "_other" in dict)) fail(`[${lang}] "${key}" no tiene su _other`);
    if (key.endsWith("_other") && !(base(key) + "_one" in dict)) fail(`[${lang}] "${key}" no tiene su _one`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problema(s) de traducciones:`);
  problems.slice(0, 60).forEach(p => console.error(" - " + p));
  process.exit(1);
}
console.log(`OK: traducciones coherentes (${Object.keys(dicts).length} idiomas, ${Object.keys(es).length} textos, ${used.size} claves usadas)`);
