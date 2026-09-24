// Comprueba que cada import local (./ y ../) resuelva a un archivo y que los nombres importados existan.
// Metro no lo detecta: un `import { algo }` inexistente compila y falla en ejecución con `undefined`.
// Uso: npm run verify
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const EXTS = ["", ".js", ".jsx", "/index.js", "/index.jsx"];

const resolve = (from, spec) => {
  const base = path.resolve(path.dirname(from), spec);
  for (const e of EXTS) {
    const p = base + e;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
};

const cache = {};
function exportsOf(file) {
  if (cache[file]) return cache[file];
  const src = fs.readFileSync(file, "utf8");
  const set = (cache[file] = new Set());
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+(\w+)/g)) set.add(m[1]);
  if (/export\s+default/.test(src)) set.add("default");
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim();
      if (name) set.add(name.split(/\s+as\s+/).pop().trim());
    }
  }
  for (const m of src.matchAll(/export\s*\*\s*from\s*["']([^"']+)["']/g)) {
    const target = resolve(file, m[1]);
    if (target) exportsOf(target).forEach(x => set.add(x));
  }
  return set;
}

const files = [path.join(ROOT, "App.jsx")];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.jsx?$/.test(f)) files.push(p);
  }
})(path.join(ROOT, "src"));

let problems = 0;
const report = msg => { console.log("✖", msg); problems++; };
const rel = p => path.relative(ROOT, p);

for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!/^import\s/.test(lines[i])) continue;
    let stmt = lines[i];
    for (let j = i; !/from\s+["'][^"']+["'];?\s*$/.test(stmt) && !/^import\s+["']/.test(stmt) && j < lines.length - 1; ) stmt += " " + lines[++j];
    const m = stmt.match(/^import\s+(.*?)\s+from\s+["']([^"']+)["']/);
    if (!m || !m[2].startsWith(".")) continue;

    const target = resolve(file, m[2]);
    if (!target) { report(`${rel(file)}: no resuelve "${m[2]}"`); continue; }

    const available = exportsOf(target);
    const clause = m[1].trim();
    const named = clause.match(/\{([\s\S]*)\}/);
    if (named) {
      for (const part of named[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name && !available.has(name)) report(`${rel(file)}: importa "${name}", que no existe en ${rel(target)}`);
      }
    }
    const def = clause.replace(/\{[\s\S]*\}/, "").replace(/,/g, "").trim();
    if (def && !def.startsWith("*") && !available.has("default")) report(`${rel(file)}: import default inexistente en ${rel(target)}`);
  }
}

console.log(problems ? `${problems} problema(s) de imports` : `OK: imports locales válidos (${files.length} archivos)`);
process.exit(problems ? 1 : 0);
