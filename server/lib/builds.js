// Builds de los Challenger: se suman las partidas de Solo/Dúo de jugadores Challenger (los 10 participantes de cada una)
// por parche y por campeón: objetos finales, runas, hechizos y posición, con partidas y victorias de cada opción.
// Además, por campeón: contra quién jugó su línea (`vs`, con la build de ese cruce), el tipo de daño que hace (`dmg`) y,
// si llega la línea de tiempo de la partida, el orden en que subió las habilidades (`max`, `start`, `seq`).
// Todo puro (sin red) para poder probarlo; lib/buildsJob.js junta las partidas y routes/lol.js lo sirve.

const MIN_DURATION_S = 15 * 60;   // menos de 15 min: remake o rendición temprana, no cuenta
const MAX_PATCHES = 2;            // se guardan el parche actual y el anterior

/** "16.20.712.1234" -> "16.20" */
const patchOf = version => String(version || "").split(".").slice(0, 2).join(".");

/** Compara parches "16.9" < "16.20" */
const comparePatch = (a, b) => {
  const [a1, a2] = a.split(".").map(Number), [b1, b2] = b.split(".").map(Number);
  return a1 - b1 || a2 - b2;
};

const bump = (map, key, win) => {
  const k = String(key);
  const v = map[k] || (map[k] = [0, 0]);
  v[0]++;
  if (win) v[1]++;
};

const SLOT = { 1: "Q", 2: "W", 3: "E", 4: "R" };

/** participantId -> "QEWQQRQWQWRWWEE" (las habilidades en el orden en que se subieron, de la línea de tiempo) */
function skillOrders(timeline) {
  const out = {};
  for (const f of timeline?.info?.frames || []) {
    for (const e of f.events || []) {
      if (e.type === "SKILL_LEVEL_UP" && e.levelUpType !== "EVOLVE" && SLOT[e.skillSlot]) out[e.participantId] = (out[e.participantId] || "") + SLOT[e.skillSlot];
    }
  }
  return out;
}

/** "QEWQQRQWQWR..." -> orden en que se llevaron al máximo Q, W y E ("QWE"): la que antes llega a 5 puntos va primero */
function maxOrder(seq) {
  const count = { Q: 0, W: 0, E: 0 }, done = [];
  for (const k of seq) {
    if (!(k in count)) continue;
    if (++count[k] === 5) done.push(k);
  }
  for (const k of ["Q", "W", "E"].sort((a, b) => count[b] - count[a])) if (!done.includes(k)) done.push(k);
  return done.join("");
}

/** Suma una partida (respuesta cruda de match-v5) al acumulado. Devuelve true si la partida contó.
 *  timeline (opcional): la línea de tiempo de esa partida, para el orden de habilidades. */
function addMatch(agg, match, timeline = null) {
  const info = match?.info;
  if (!info || info.queueId !== 420 || (info.gameDuration || 0) < MIN_DURATION_S) return false;
  const patch = patchOf(info.gameVersion);
  if (!patch) return false;
  const p = agg.patches[patch] || (agg.patches[patch] = { matches: 0, champs: {} });
  p.matches++;
  const orders = skillOrders(timeline);
  const people = info.participants || [];
  for (const x of people) {
    if (!x.championId || x.gameEndedInEarlySurrender) continue;
    const c = p.champs[x.championId] || (p.champs[x.championId] = { games: 0, wins: 0, pos: {}, items: {}, keystones: {}, pages: {}, spells: {} });
    const win = Boolean(x.win);
    c.games++;
    if (win) c.wins++;
    if (x.teamPosition) bump(c.pos, x.teamPosition, win);
    const items = [x.item0, x.item1, x.item2, x.item3, x.item4, x.item5].filter(Boolean);
    for (const id of items) bump(c.items, id, win);
    // Tipo de daño a campeones (físico, mágico, verdadero): para saber qué defensa conviene contra él
    c.dmg = c.dmg || [0, 0, 0];
    c.dmg[0] += x.physicalDamageDealtToChampions || 0;
    c.dmg[1] += x.magicDamageDealtToChampions || 0;
    c.dmg[2] += x.trueDamageDealtToChampions || 0;
    // Rival de línea: el del otro equipo en la misma posición. Su cruce guarda la build y los hechizos de ese duelo
    const foe = x.teamPosition && people.find(y => y.teamId !== x.teamId && y.teamPosition === x.teamPosition && y.championId);
    if (foe) {
      c.vs = c.vs || {};
      const v = c.vs[foe.championId] || (c.vs[foe.championId] = { games: 0, wins: 0, pos: {}, items: {}, keystones: {}, spells: {} });
      v.games++;
      if (win) v.wins++;
      bump(v.pos, x.teamPosition, win);
      for (const id of items) bump(v.items, id, win);
      const ks = x.perks?.styles?.[0]?.selections?.[0]?.perk;
      if (ks) bump(v.keystones, ks, win);
      if (x.summoner1Id && x.summoner2Id) bump(v.spells, [x.summoner1Id, x.summoner2Id].sort((a, b) => a - b).join("-"), win);
    }
    // Orden de habilidades: el máximo (QWE), los tres primeros puntos y la secuencia de los 11 primeros niveles
    const seq = orders[x.participantId];
    if (seq && seq.length >= 6) {
      c.max = c.max || {}; c.start = c.start || {}; c.seq = c.seq || {};
      bump(c.max, maxOrder(seq), win);
      bump(c.start, seq.slice(0, 3), win);
      if (seq.length >= 11) bump(c.seq, seq.slice(0, 11), win);
    }
    const [primary, secondary] = x.perks?.styles || [];
    const keystone = primary?.selections?.[0]?.perk;
    if (keystone) bump(c.keystones, keystone, win);
    if (primary && secondary) {
      const page = `${primary.style}:${(primary.selections || []).map(s => s.perk).join(",")}|${secondary.style}:${(secondary.selections || []).map(s => s.perk).join(",")}`;
      bump(c.pages, page, win);
    }
    if (x.summoner1Id && x.summoner2Id) bump(c.spells, [x.summoner1Id, x.summoner2Id].sort((a, b) => a - b).join("-"), win);
  }
  // Solo se conservan los parches más recientes
  const keep = Object.keys(agg.patches).sort(comparePatch).slice(-MAX_PATCHES);
  for (const k of Object.keys(agg.patches)) if (!keep.includes(k)) delete agg.patches[k];
  return true;
}

const emptyAggregate = () => ({ patches: {}, updatedAt: null });

/** Las `n` opciones más jugadas: [{ key, games, wins }] */
const top = (map, n) => Object.entries(map || {})
  .map(([key, [games, wins]]) => ({ key, games, wins }))
  .sort((a, b) => b.games - a.games || b.wins - a.wins)
  .slice(0, n);

/**
 * Resumen de un campeón: el parche más reciente con al menos `minGames` partidas suyas (o el que tenga más).
 * null si no hay datos de ese campeón.
 */
function championSummary(agg, championId, minGames = 5) {
  const patches = Object.keys(agg?.patches || {}).sort(comparePatch).reverse();
  const withChamp = patches.filter(p => agg.patches[p].champs[championId]);
  if (!withChamp.length) return null;
  const patch = withChamp.find(p => agg.patches[p].champs[championId].games >= minGames) || withChamp[0];
  const c = agg.patches[patch].champs[championId];
  const page = top(c.pages, 3).map(x => {
    const [prim, sec] = x.key.split("|");
    const [primaryStyle, primaryPerks] = prim.split(":");
    const [secondaryStyle, secondaryPerks] = sec.split(":");
    return {
      games: x.games, wins: x.wins,
      primaryStyle: Number(primaryStyle), primary: primaryPerks.split(",").map(Number),
      secondaryStyle: Number(secondaryStyle), secondary: secondaryPerks.split(",").map(Number),
    };
  });
  return {
    championId: Number(championId),
    patch,
    games: c.games,
    wins: c.wins,
    matches: agg.patches[patch].matches,
    positions: top(c.pos, 5).map(x => ({ position: x.key, games: x.games, wins: x.wins })),
    items: top(c.items, 40).map(x => ({ id: Number(x.key), games: x.games, wins: x.wins })),
    keystones: top(c.keystones, 3).map(x => ({ id: Number(x.key), games: x.games, wins: x.wins })),
    pages: page,
    spells: top(c.spells, 3).map(x => ({ ids: x.key.split("-").map(Number), games: x.games, wins: x.wins })),
    updatedAt: agg.updatedAt,
  };
}

/** Todos los campeones del parche más reciente: [{ championId, games, wins }] por partidas */
function metaSummary(agg) {
  const patch = Object.keys(agg?.patches || {}).sort(comparePatch).pop();
  if (!patch) return { patch: null, matches: 0, champions: [], updatedAt: agg?.updatedAt ?? null };
  const p = agg.patches[patch];
  return {
    patch,
    matches: p.matches,
    champions: Object.entries(p.champs).map(([id, c]) => ({ championId: Number(id), games: c.games, wins: c.wins, position: top(c.pos, 1)[0]?.key || null }))
      .sort((a, b) => b.games - a.games),
    updatedAt: agg.updatedAt,
  };
}

// --- Enfrentamientos -------------------------------------------------------------------------------------------------

// Suma los mapas { clave: [partidas, victorias] } de varios parches
function mergeMaps(maps) {
  const out = {};
  for (const m of maps) for (const [k, [g, w]] of Object.entries(m || {})) {
    const v = out[k] || (out[k] = [0, 0]);
    v[0] += g; v[1] += w;
  }
  return out;
}

/** Un campeón con sus datos sumados en los parches guardados (más muestra para cada cruce). null si no hay datos. */
function mergedChamp(agg, championId) {
  const list = Object.values(agg?.patches || {}).map(p => p.champs[championId]).filter(Boolean);
  if (!list.length) return null;
  const vs = {};
  for (const c of list) for (const [id, v] of Object.entries(c.vs || {})) {
    const o = vs[id] || (vs[id] = { games: 0, wins: 0, pos: [], items: [], keystones: [], spells: [] });
    o.games += v.games; o.wins += v.wins;
    o.pos.push(v.pos); o.items.push(v.items); o.keystones.push(v.keystones); o.spells.push(v.spells);
  }
  for (const o of Object.values(vs)) for (const k of ["pos", "items", "keystones", "spells"]) o[k] = mergeMaps(o[k]);
  const sum = key => mergeMaps(list.map(c => c[key]));
  return {
    games: list.reduce((n, c) => n + c.games, 0), wins: list.reduce((n, c) => n + c.wins, 0),
    pos: sum("pos"), items: sum("items"), keystones: sum("keystones"), spells: sum("spells"),
    max: sum("max"), start: sum("start"), seq: sum("seq"),
    dmg: list.reduce((d, c) => (c.dmg ? d.map((x, i) => x + c.dmg[i]) : d), [0, 0, 0]),
    vs,
  };
}

const rate = x => (x.games ? x.wins / x.games : 0);
const choices = (map, n) => top(map, n).map(x => ({ key: x.key, games: x.games, wins: x.wins }));

/** Rivales de línea de un campeón, de más a menos frecuente: [{ championId, games, wins }] (para elegir el rival) */
function opponentsOf(agg, championId, { position = null, limit = 60 } = {}) {
  const c = mergedChamp(agg, championId);
  if (!c) return [];
  return Object.entries(c.vs)
    .filter(([, v]) => !position || v.pos[position])
    .map(([id, v]) => ({ championId: Number(id), games: position ? v.pos[position][0] : v.games, wins: position ? v.pos[position][1] : v.wins }))
    .sort((a, b) => b.games - a.games)
    .slice(0, limit);
}

/**
 * Cruce `championId` contra `enemyId`: cómo le va, la build de ese cruce (o la general si hay muy pocas partidas, con
 * `items.general: true`), runas, hechizos, orden de habilidades del campeón, counters en su línea y el tipo de daño del
 * rival. Cada cifra trae cuántas partidas la respaldan. null si no hay ningún dato del campeón.
 */
function matchupSummary(agg, championId, enemyId, { minMatchup = 5, minCounter = 8 } = {}) {
  const c = mergedChamp(agg, championId);
  if (!c) return null;
  const e = mergedChamp(agg, enemyId);
  const v = c.vs[enemyId] || null;
  const position = (v && top(v.pos, 1)[0]?.key) || top(c.pos, 1)[0]?.key || null;
  const enough = Boolean(v && v.games >= minMatchup);
  // Counters: rivales de su misma línea con suficientes partidas, por winrate del campeón contra ellos
  const lane = Object.entries(c.vs)
    .map(([id, o]) => ({ championId: Number(id), games: o.pos[position]?.[0] ?? 0, wins: o.pos[position]?.[1] ?? 0 }))
    .filter(o => o.games >= minCounter);
  const byRate = [...lane].sort((a, b) => rate(b) - rate(a) || b.games - a.games);
  const total = e ? e.dmg.reduce((a, b) => a + b, 0) : 0;
  return {
    championId: Number(championId),
    enemyId: Number(enemyId),
    patches: Object.keys(agg.patches).sort(comparePatch),
    position,
    games: c.games,
    matchup: v ? { games: v.games, wins: v.wins } : { games: 0, wins: 0 },
    items: { general: !enough, list: choices(enough ? v.items : c.items, 8).map(x => ({ id: Number(x.key), games: x.games, wins: x.wins })) },
    keystones: choices(enough ? v.keystones : c.keystones, 2).map(x => ({ id: Number(x.key), games: x.games, wins: x.wins })),
    spells: choices(enough ? v.spells : c.spells, 2).map(x => ({ ids: x.key.split("-").map(Number), games: x.games, wins: x.wins })),
    skills: {
      max: choices(c.max, 1)[0] || null,
      start: choices(c.start, 1)[0] || null,
      sequence: choices(c.seq, 1)[0] || null,
    },
    counters: {
      beats: byRate.filter(o => rate(o) > 0.5).slice(0, 3),
      losesTo: [...byRate].reverse().filter(o => rate(o) < 0.5).slice(0, 3),
    },
    enemyDamage: total ? { physical: e.dmg[0] / total, magic: e.dmg[1] / total, true: e.dmg[2] / total, games: e.games } : null,
    updatedAt: agg.updatedAt,
  };
}

/** Cruces más jugados de una línea (para la lupa): [{ championId, enemyId, games, wins }], sin repetir el mismo par */
function popularMatchups(agg, position, limit = 8) {
  const ids = new Set();
  for (const p of Object.values(agg?.patches || {})) for (const id of Object.keys(p.champs)) ids.add(id);
  const all = [];
  for (const id of ids) {
    const c = mergedChamp(agg, id);
    for (const [foe, v] of Object.entries(c.vs)) {
      const pv = v.pos[position];
      if (pv) all.push({ championId: Number(id), enemyId: Number(foe), games: pv[0], wins: pv[1] });
    }
  }
  const seen = new Set(), out = [];
  for (const m of all.sort((a, b) => b.games - a.games || a.championId - b.championId)) {
    const pair = [m.championId, m.enemyId].sort((a, b) => a - b).join("-");
    if (seen.has(pair)) continue;
    seen.add(pair);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}

module.exports = { addMatch, emptyAggregate, championSummary, metaSummary, matchupSummary, opponentsOf, popularMatchups, skillOrders, maxOrder, patchOf, comparePatch, MIN_DURATION_S };
