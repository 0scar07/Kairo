// Cálculos de rango de LoL: puntuación continua para graficar, foto (snapshot) del rango, cambios entre fotos y el
// resumen semanal. Todo puro (sin red ni base de datos) para poder probarlo fácil.

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = { IV: 0, III: 1, II: 2, I: 3 };
const APEX = 7;   // desde MASTER no hay divisiones: el LP sigue sumando sobre una misma base

/**
 * Puntos de liga en una sola escala: 400 por nivel (100 por división) y el LP encima.
 * Hierro IV 0 LP = 0, Oro IV 0 = 1200, Diamante I 99 LP = 2799, Maestro 0 LP = 2800 y de ahí sigue subiendo con el LP.
 */
function scoreOf({ tier, rank, lp }) {
  const t = TIERS.indexOf(tier);
  if (t < 0) return null;
  if (t >= APEX) return 2800 + (lp || 0);
  return t * 400 + (DIVISIONS[rank] ?? 0) * 100 + (lp || 0);
}

const entryOf = e => (e ? {
  tier: e.tier, rank: e.rank, lp: e.leaguePoints ?? 0, wins: e.wins ?? 0, losses: e.losses ?? 0,
  promo: Boolean(e.miniSeries),                        // está jugando una serie de ascenso
  score: scoreOf({ tier: e.tier, rank: e.rank, lp: e.leaguePoints }),
} : null);

/** De las entradas de league-v4 se queda con lo que se guarda: Solo/Dúo y Flex. */
function snapshotFromEntries(entries) {
  const find = q => entryOf((entries || []).find(e => e.queueType === q));
  return { solo: find("RANKED_SOLO_5x5"), flex: find("RANKED_FLEX_SR") };
}

const dayKey = ms => new Date(ms).toISOString().slice(0, 10);

/**
 * ¿Qué cambió entre dos fotos de Solo/Dúo? "up"/"down" cuando cambia el nivel o la división (aunque el LP se mueva
 * dentro de la misma división no cuenta), "promo" cuando aparece una serie de ascenso que antes no estaba.
 */
function rankChange(prev, next) {
  const a = prev?.solo, b = next?.solo;
  if (!a || !b) return null;
  const at = TIERS.indexOf(a.tier) * 10 + (TIERS.indexOf(a.tier) >= APEX ? 0 : DIVISIONS[a.rank] ?? 0);
  const bt = TIERS.indexOf(b.tier) * 10 + (TIERS.indexOf(b.tier) >= APEX ? 0 : DIVISIONS[b.rank] ?? 0);
  if (bt > at) return { kind: "up", tier: b.tier, rank: b.rank };
  if (bt < at) return { kind: "down", tier: b.tier, rank: b.rank };
  if (b.promo && !a.promo) return { kind: "promo", tier: b.tier, rank: b.rank };
  return null;
}

/**
 * Resumen entre dos fotos (por ejemplo, hace una semana y hoy) en Solo/Dúo:
 * { games, wins, winrate, lp } o null si no hay datos comparables o no se jugó nada.
 */
function summarize(old, now) {
  const a = old?.solo, b = now?.solo;
  if (!a || !b) return null;
  const wins = b.wins - a.wins, losses = b.losses - a.losses;
  const games = wins + losses;
  if (games <= 0) return null;
  return { games, wins, winrate: Math.round((wins / games) * 100), lp: b.score - a.score };
}

// Semana ISO ("2026-W39") de un instante, en la hora local que indica el desfase (minutos respecto a UTC)
function isoWeek(ms, offsetMinutes = 0) {
  const d = new Date(ms + offsetMinutes * 60_000);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ¿Es domingo entre las 18:00 y las 22:00 en la hora local del dispositivo?
function isWeeklyWindow(ms, offsetMinutes = 0) {
  const d = new Date(ms + offsetMinutes * 60_000);
  return d.getUTCDay() === 0 && d.getUTCHours() >= 18 && d.getUTCHours() < 22;
}

module.exports = { TIERS, scoreOf, snapshotFromEntries, dayKey, rankChange, summarize, isoWeek, isWeeklyWindow };
