/**
 * Wild Rift no tiene API de Riot ni perfiles de jugador públicos. Lo que sí es público:
 *  - Las estadísticas de campeones del servidor chino (la única región con estadísticas oficiales de ranked; las
 *    mismas que usan las páginas de meta): winrate, pickrate, banrate y fuerza por carril y rango, una vez al día.
 *  - Los esports, con la API de PandaScore (necesita PANDASCORE_TOKEN).
 * Aquí se normalizan esas respuestas al formato que usa la app. No se guarda nada de jugadores.
 */

// Carriles: la fuente los numera; se dedujo cruzando cada número con el carril de sus campeones
const LANES = { 1: "mid", 2: "baron", 3: "dragon", 4: "support", 5: "jungle" };
const LANE_IDS = Object.values(LANES);

// Rangos: la fuente usa 0–4. Por los datos (1 y 2 casi iguales) y por lo que muestran las páginas de meta
// (Diamante+, Maestro+, Retador, Legendario) se deduce 0 = Diamante+, 1 = Maestro+, 2 = Gran Maestro+,
// 3 = Retador y 4 = Legendario. Se ofrecen los cuatro que usan esas páginas.
const RANKS = { diamond: "0", master: "1", challenger: "3", legend: "4" };
const RANK_IDS = Object.keys(RANKS);

// strength_level 0–5 → tier (0 es el más fuerte)
const TIERS = ["S+", "S", "A", "B", "C", "D"];

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Nombre del campeón (en inglés) a partir del póster de la lista oficial: ".../Posters/Garen_0.jpg" → "Garen" */
function championKey(hero) {
  const m = /\/Posters\/([A-Za-z]+)_\d+\./.exec(hero?.poster || "");
  return m ? m[1] : null;
}

/** Lista de campeones: { heroId: { heroId, key, avatar, poster, lanes } } */
function normalizeHeroes(raw) {
  const out = {};
  for (const [id, h] of Object.entries(raw?.heroList || {})) {
    out[id] = { heroId: id, key: championKey(h), avatar: h.avatar || null, poster: h.poster || null };
  }
  return out;
}

function entryOf(e, heroes) {
  const hero = heroes[e.hero_id];
  const level = num(e.strength_level);
  const trend = num(e.win_rate_float);
  const dir = v => (num(v) > 0 ? 1 : num(v) < 0 ? -1 : 0);
  return {
    heroId: String(e.hero_id),
    key: hero?.key || null,
    avatar: hero?.avatar || null,
    poster: hero?.poster || null,
    tier: TIERS[level] ?? null,
    strength: num(e.strength),                    // puesto en el carril (1 = el más fuerte)
    winRate: num(e.win_rate_percent),
    pickRate: num(e.appear_rate_percent),
    banRate: num(e.forbid_rate_percent),
    trend: trend > 0 ? 1 : trend < 0 ? -1 : 0,    // cambio del winrate respecto al día anterior
    pickTrend: dir(e.appear_rate_float),          // y de la elección y el baneo (la fuente solo da la dirección)
    banTrend: dir(e.forbid_rate_float),
  };
}

const byStrength = (a, b) => (a.strength ?? 999) - (b.strength ?? 999);

/** Meta de un rango: { date, rank, lanes: { mid: [...], baron: [...], ... } } ordenado por fuerza */
function normalizeMeta(raw, heroes, rank) {
  const block = raw?.data?.[RANKS[rank]];
  if (!block) return null;
  const lanes = {};
  let date = null;
  for (const [pos, list] of Object.entries(block)) {
    const lane = LANES[pos];
    if (!lane || !Array.isArray(list)) continue;
    lanes[lane] = list.map(e => entryOf(e, heroes)).sort(byStrength);
    date = date || list[0]?.dtstatdate || null;
  }
  return { date: formatDate(date), rank, lanes };
}

/** Un campeón en todos los rangos y carriles en los que aparece: { heroId, key, ..., byRank: { diamond: { mid: entry } } } */
function championStats(raw, heroes, heroId) {
  const hero = heroes[heroId];
  if (!hero) return null;
  const byRank = {};
  for (const rank of RANK_IDS) {
    const block = raw?.data?.[RANKS[rank]] || {};
    for (const [pos, list] of Object.entries(block)) {
      const e = (list || []).find(x => String(x.hero_id) === String(heroId));
      if (!e || !LANES[pos]) continue;
      (byRank[rank] ||= {})[LANES[pos]] = { ...entryOf(e, heroes), of: list.length };
    }
  }
  return { heroId: String(heroId), key: hero.key, avatar: hero.avatar, poster: hero.poster, byRank };
}

// "20261018" → "2026-10-18"
function formatDate(d) {
  const s = String(d || "");
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : null;
}

// --- Novedades (web oficial de Wild Rift) ---

const NEWS_SITE = "https://wildrift.leagueoflegends.com";
// Idioma de la app → sección de la web oficial
const NEWS_LOCALES = { es: "es-mx", en: "en-us", pt: "pt-br", fr: "fr-fr", de: "de-de" };

/**
 * Noticias de "Actualizaciones del juego" a partir de los datos de la página (__NEXT_DATA__ de Next.js):
 * [{ title, date, url, image, patch }] de la más nueva a la más vieja. Solo los enlaces a la propia web (los videos
 * de YouTube se descartan) y sin el texto del artículo: la app abre la noticia en el navegador.
 */
function normalizeNews(data, limit = 8) {
  const seen = new Map();
  const walk = o => {
    if (!o || typeof o !== "object") return;
    const url = o.action?.payload?.url;
    if (typeof o.title === "string" && o.publishedAt && typeof url === "string" && url.startsWith("/")) {
      if (!seen.has(url)) {
        seen.set(url, {
          title: o.title,
          date: o.publishedAt,
          url: NEWS_SITE + url,
          image: o.media?.url || o.imageMedia?.url || null,
          patch: /patch-notes/.test(url),
        });
      }
      return;
    }
    for (const v of Object.values(o)) walk(v);
  };
  walk(data);
  return [...seen.values()].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, limit);
}

/** Saca el JSON de __NEXT_DATA__ del HTML de la página */
function nextData(html) {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(String(html || ""));
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// --- Esports (PandaScore): compartido con Valorant en lib/pandascore.js ---
const { normalizeMatch, normalizeTournament } = require("./pandascore");

module.exports = {
  LANES, LANE_IDS, RANKS, RANK_IDS, TIERS, NEWS_LOCALES,
  championKey, normalizeHeroes, normalizeMeta, championStats, normalizeMatch, normalizeTournament, formatDate,
  normalizeNews, nextData,
};
