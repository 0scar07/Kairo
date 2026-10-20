// Cuánto cambia algo según los números de "antes → ahora" (0 si no hay números que comparar)
const nums = s => (String(s || "").match(/-?\d+(?:[.,]\d+)?/g) || []).map(x => Number(x.replace(",", ".")));
function magnitude(line) {
  const a = nums(line.before).reduce((x, y) => x + y, 0);
  const b = nums(line.after).reduce((x, y) => x + y, 0);
  if (!a && !b) return 0;
  return Math.abs(b - a) / Math.max(Math.abs(a), 1);
}

const champions = article => (article?.sections || []).flatMap(s => s.entries).filter(e => e.kind === "champion");

/** El cambio más grande de un campeón: { group, line, size } */
export function biggestChange(entry) {
  let best = null;
  for (const g of entry.groups || []) {
    for (const l of g.lines || []) {
      if (l.before == null) continue;
      const size = magnitude(l);
      if (!best || size > best.size) best = { group: g.title, line: l, size };
    }
  }
  return best;
}

/**
 * Lo esencial: los 3 campeones con el cambio más grande (con sentido claro), del más al menos importante. Si alguno
 * baja, siempre entra el que más baja, para que se vean los dos lados del parche.
 */
export function essentials(article, count = 3) {
  const ranked = champions(article)
    .filter(e => e.dir)
    .map(e => ({ entry: e, change: biggestChange(e) }))
    .filter(x => x.change)
    .sort((a, b) => b.change.size - a.change.size);
  const picked = ranked.slice(0, count);
  const down = ranked.find(x => x.entry.dir < 0);
  if (down && !picked.some(x => x.entry.dir < 0) && picked.length) picked[picked.length - 1] = down;
  return picked;
}

/** Top 5 del parche: los campeones con más cambios (a igualdad, los que suben primero) */
export function topChanges(article, count = 5) {
  const lines = e => (e.groups || []).reduce((n, g) => n + g.lines.length, 0);
  return champions(article)
    .slice()
    .sort((a, b) => lines(b) - lines(a) || b.dir - a.dir)
    .slice(0, count);
}
