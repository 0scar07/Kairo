const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream } = require("../lib/upstream");
const { TtlCache } = require("../lib/cache");
const es = require("../lib/esports");

/**
 * Esports de LoL: ligas profesionales, clasificaciones, rosters y estadísticas de los jugadores por torneo.
 * Fuentes: la API de lolesports.com (la misma que usa su web; la key es pública y se puede cambiar con
 * LOLESPORTS_API_KEY) y el feed de estadísticas en vivo feed.lolesports.com (sin key). No es una API oficial de Riot
 * para terceros: si cambia, estas rutas responden un error y la app lo muestra sin romper lo demás.
 *   GET /leagues                         ligas de la app (LCK, LPL, LEC, LCS, LTA, LLA, Mundial, MSI)
 *   GET /leagues/:slug?tournamentId=     torneos de la liga y la clasificación del elegido (el más reciente por defecto)
 *   GET /teams/:slug                     equipo con su roster (foto, nombre y rol)
 *   GET /teams/:slug/stats?tournamentId= estadísticas de cada jugador del roster en ese torneo (y por campeón)
 * Todas aceptan ?hl=es|en|pt|fr|de para los nombres de fases y grupos.
 */
const PUBLIC_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";   // la que publica lolesports.com en su propia web
const gw = createUpstream({
  id: "lolesports",
  name: "LoL Esports",
  base: "https://esports-api.lolesports.com/persisted/gw",
  baseEnv: "LOLESPORTS_API_BASE",
  keyEnv: "LOLESPORTS_API_KEY",
  optional: true,
  timeout: 12000,
  headers: key => ({ "x-api-key": key || PUBLIC_KEY }),
});
const feed = createUpstream({
  id: "lolfeed",
  name: "LoL Esports (estadísticas)",
  base: "https://feed.lolesports.com/livestats/v1",
  baseEnv: "LOLESPORTS_FEED_BASE",
  timeout: 12000,
});

const router = Router();
const MIN = 60_000;
const HOUR = 60 * MIN;
const games = new TtlCache({ max: 4000 });   // partidas terminadas ya resumidas (no cambian)
const FEED_CONCURRENCY = 4;

const HL = { es: "es-MX", en: "en-US", pt: "pt-BR", fr: "fr-FR", de: "de-DE" };
const hlOf = req => HL[String(req.query.hl || "es").slice(0, 2)] || "es-MX";
const idOf = value => (/^\d{1,25}$/.test(String(value || "")) ? String(value) : null);
const slugOf = value => {
  const s = String(value || "");
  if (!/^[a-z0-9_-]{1,60}$/i.test(s)) throw new HttpError(400, "Identificador inválido", { code: "BAD_REQUEST" });
  return s;
};

const data = r => r?.data || {};

async function leagues(hl) {
  return es.pickLeagues(data(await gw.get("/getLeagues", { ttl: 24 * HOUR, query: { hl } })).leagues);
}

router.get("/leagues", handle(async (req, res) => {
  res.json(await leagues(hlOf(req)));
}));

router.get("/leagues/:slug", handle(async (req, res) => {
  const hl = hlOf(req);
  const slug = slugOf(req.params.slug);
  const league = (await leagues(hl)).find(l => l.slug === slug);
  if (!league) throw new HttpError(404, "Liga no encontrada", { code: "NOT_FOUND" });
  const tournaments = es.pickTournaments(data(await gw.get("/getTournamentsForLeague", { ttl: 6 * HOUR, query: { hl, leagueId: league.id } })).leagues?.[0]?.tournaments);
  const tournamentId = idOf(req.query.tournamentId) || tournaments[0]?.id || null;
  let standings = tournamentId
    ? es.pickStandings(data(await gw.get("/getStandings", { ttl: 15 * MIN, query: { hl, tournamentId } })).standings)
    : [];
  // Sin tabla (formato suizo o eliminatorias): se arma con las series terminadas
  let fromResults = false;
  if (tournamentId && !standings.length) {
    const events = data(await gw.get("/getCompletedEvents", { ttl: 15 * MIN, query: { hl, tournamentId } })).schedule?.events;
    standings = es.standingsFromEvents(events, await allTeams(hl));
    fromResults = standings.length > 0;
  }
  res.json({ league, tournaments, tournamentId, standings, fromResults });
}));

// Índice de todos los equipos de lolesports (para reconocer a los de los eventos, que no traen su slug)
const indexCache = new TtlCache({ max: 5 });
const allTeams = hl => indexCache.wrap(`teams:${hl}`, 24 * HOUR, async () =>
  es.teamIndex(data(await gw.get("/getTeams", { ttl: 0, query: { hl } })).teams));

async function team(slug, hl) {
  const t = es.pickTeam(data(await gw.get("/getTeams", { ttl: 6 * HOUR, query: { hl, id: slug }, notFound: { message: "Equipo no encontrado", code: "NOT_FOUND" } })).teams?.[0]);
  if (!t) throw new HttpError(404, "Equipo no encontrado", { code: "NOT_FOUND" });
  return t;
}

router.get("/teams/:slug", handle(async (req, res) => {
  res.json(await team(slugOf(req.params.slug), hlOf(req)));
}));

// Una partida terminada, resumida (primer fotograma, último fotograma y detalle final). null si no se jugó.
function game(gameId) {
  return games.wrap(gameId, 7 * 24 * HOUR, async () => {
    const first = await feed.get(`/window/${gameId}`, { ttl: 0 }).catch(() => null);
    const start = first?.frames?.[0]?.rfc460Timestamp;
    if (!start) return null;
    const at = { startingTime: es.endTimestamp(start) };
    const [last, details] = await Promise.all([
      feed.get(`/window/${gameId}`, { ttl: 0, query: at }).catch(() => null),
      feed.get(`/details/${gameId}`, { ttl: 0, query: at }).catch(() => null),
    ]);
    return es.reduceGame({ first, last, details });
  });
}

// Ejecuta `fn` sobre cada elemento con como mucho `n` a la vez
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

const statsCache = new TtlCache({ max: 300 });

router.get("/teams/:slug/stats", handle(async (req, res) => {
  const hl = hlOf(req);
  const slug = slugOf(req.params.slug);
  const tournamentId = idOf(req.query.tournamentId);
  if (!tournamentId) throw new HttpError(400, "Falta el torneo", { code: "BAD_REQUEST" });
  const body = await statsCache.wrap(`${slug}:${tournamentId}`, HOUR, async () => {
    const t = await team(slug, hl);
    const events = data(await gw.get("/getCompletedEvents", { ttl: 30 * MIN, query: { hl, tournamentId } })).schedule?.events;
    const series = es.teamSeries(events, t);
    const gameIds = series.flatMap(s => s.gameIds);
    const reduced = await pool(gameIds, FEED_CONCURRENCY, id => game(id).catch(() => null));
    const byId = new Map(gameIds.map((id, i) => [id, reduced[i]]));
    const seriesList = series.map(s => ({ teamWins: s.teamWins, games: s.gameIds.map(id => byId.get(id)) }));
    return {
      tournamentId,
      series: series.length,
      games: reduced.filter(Boolean).length,
      players: es.rosterStats(seriesList, String(t.id)),
    };
  });
  res.json(body);
}));

module.exports = router;
