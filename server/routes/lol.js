const { createGameRouter, regionOf, puuidOf } = require("./gameRouter");
const { riotGet, handle } = require("../lib/riot");
const { platformHost } = require("../lib/regions");
const PATHS = require("../lib/paths");
const { HttpError } = require("../lib/errors");
const { normalizeLive, soloEntry } = require("../lib/live");

// League of Legends: summoner-v4, league-v4, match-v5 + maestría, rotación, estado del servidor y partida en vivo
const router = createGameRouter("lol", PATHS.lol);

const MIN = 60_000;

// Los 3 campeones con más maestría (o los que se pidan, máx. 10) y el puntaje total
router.get("/mastery/:puuid", handle(async (req, res) => {
  const puuid = puuidOf(req);
  const host = platformHost(regionOf(req));
  const count = Math.min(Math.max(parseInt(req.query.count, 10) || 3, 1), 10);
  const [top, score] = await Promise.all([
    riotGet(`${host}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`, { ttl: 10 * MIN }),
    riotGet(`${host}/lol/champion-mastery/v4/scores/by-puuid/${puuid}`, { ttl: 10 * MIN }),
  ]);
  res.json({
    score,
    top: top.map(m => ({ championId: m.championId, level: m.championLevel, points: m.championPoints, lastPlayTime: m.lastPlayTime })),
  });
}));

// Rotación semanal gratuita (IDs numéricos de campeón)
router.get("/rotation", handle(async (req, res) => {
  const data = await riotGet(`${platformHost(regionOf(req))}/lol/platform/v3/champion-rotations`, { ttl: 60 * MIN });
  // Riot cambió el formato (sr / newplayer); se aceptan también los nombres antiguos por si vuelven
  res.json({
    free: data.sr || data.freeChampionIds || [],
    newPlayers: data.newplayer || data.freeChampionIdsForNewPlayers || [],
  });
}));

// Estado del servidor: solo mantenimientos e incidencias, con el título en español si existe
const pickTitle = (titles = []) =>
  (titles.find(t => t.locale === "es_MX") || titles.find(t => t.locale === "es_ES") || titles.find(t => t.locale === "en_US") || titles[0] || {}).content || "";

router.get("/status", handle(async (req, res) => {
  const data = await riotGet(`${platformHost(regionOf(req))}/lol/status/v4/platform-data`, { ttl: 2 * MIN });
  res.json({
    name: data.name,
    maintenances: (data.maintenances || []).map(m => ({ id: m.id, status: m.maintenance_status, title: pickTitle(m.titles) })),
    incidents: (data.incidents || []).map(i => ({ id: i.id, severity: i.incident_severity, title: pickTitle(i.titles) })),
  });
}));

// Partida en curso (Spectator-V5) con el rango Solo/Dúo de cada jugador. Que el jugador no esté jugando no es un
// error: responde { inGame: false }. Los rangos son opcionales; si alguno falla, ese jugador queda sin rango.
router.get("/live/:puuid", handle(async (req, res) => {
  const puuid = puuidOf(req);
  const host = platformHost(regionOf(req));

  let game;
  try {
    game = await riotGet(`${host}/lol/spectator/v5/active-games/by-summoner/${puuid}`, { ttl: 15_000, notFound: "No está en partida" });
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return res.json({ inGame: false });
    throw e;
  }

  const players = (game.participants || []).filter(p => p.puuid);
  const results = await Promise.allSettled(
    players.map(p => riotGet(`${host}${PATHS.lol.ranked(p.puuid)}`, { ttl: 2 * MIN }))
  );
  const ranks = {};
  players.forEach((p, i) => { ranks[p.puuid] = results[i].status === "fulfilled" ? soloEntry(results[i].value) : null; });

  res.json(normalizeLive(game, ranks));
}));

module.exports = router;
