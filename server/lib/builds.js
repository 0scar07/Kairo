// Builds de los Challenger: se suman las partidas de Solo/Dúo de jugadores Challenger (los 10 participantes de cada una)
// por parche y por campeón: objetos finales, runas, hechizos y posición, con partidas y victorias de cada opción.
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

/** Suma una partida (respuesta cruda de match-v5) al acumulado. Devuelve true si la partida contó. */
function addMatch(agg, match) {
  const info = match?.info;
  if (!info || info.queueId !== 420 || (info.gameDuration || 0) < MIN_DURATION_S) return false;
  const patch = patchOf(info.gameVersion);
  if (!patch) return false;
  const p = agg.patches[patch] || (agg.patches[patch] = { matches: 0, champs: {} });
  p.matches++;
  for (const x of info.participants || []) {
    if (!x.championId || x.gameEndedInEarlySurrender) continue;
    const c = p.champs[x.championId] || (p.champs[x.championId] = { games: 0, wins: 0, pos: {}, items: {}, keystones: {}, pages: {}, spells: {} });
    const win = Boolean(x.win);
    c.games++;
    if (win) c.wins++;
    if (x.teamPosition) bump(c.pos, x.teamPosition, win);
    for (const id of [x.item0, x.item1, x.item2, x.item3, x.item4, x.item5]) if (id) bump(c.items, id, win);
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

module.exports = { addMatch, emptyAggregate, championSummary, metaSummary, patchOf, comparePatch, MIN_DURATION_S };
