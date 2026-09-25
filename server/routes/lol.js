const { createGameRouter, regionOf, puuidOf } = require("./gameRouter");
const { riotGet, handle } = require("../lib/riot");
const { platformHost } = require("../lib/regions");
const PATHS = require("../lib/paths");
const { HttpError } = require("../lib/errors");
const { normalizeLive, soloEntry } = require("../lib/live");
const storeRef = require("../lib/storeRef");
const rank = require("../lib/rank");
const { isRegion } = require("../lib/regions");

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
// Idioma pedido por la app (?lang=es|en|pt|fr|de) -> locales de Riot por orden de preferencia
const STATUS_LOCALES = { es: ["es_MX", "es_ES"], en: ["en_US"], pt: ["pt_BR"], fr: ["fr_FR"], de: ["de_DE"] };
const pickTitle = (titles = [], lang = "es") => {
  const wanted = [...(STATUS_LOCALES[lang] || STATUS_LOCALES.es), "en_US"];
  const found = wanted.map(locale => titles.find(t => t.locale === locale)).find(Boolean);
  return (found || titles[0] || {}).content || "";
};

router.get("/status", handle(async (req, res) => {
  const data = await riotGet(`${platformHost(regionOf(req))}/lol/status/v4/platform-data`, { ttl: 2 * MIN });
  res.json({
    name: data.name,
    maintenances: (data.maintenances || []).map(m => ({ id: m.id, status: m.maintenance_status, title: pickTitle(m.titles, req.query.lang) })),
    incidents: (data.incidents || []).map(i => ({ id: i.id, severity: i.incident_severity, title: pickTitle(i.titles, req.query.lang) })),
  });
}));

// Partida en curso (Spectator-V5) con el rango Solo/Dúo de cada jugador. Que el jugador no esté jugando no es un
// error: responde { inGame: false }. Los rangos son opcionales; si alguno falla, ese jugador queda sin rango.
router.get("/live/:puuid", handle(async (req, res) => {
  const puuid = puuidOf(req);
  const host = platformHost(regionOf(req));

  let game;
  try {
    game = await riotGet(`${host}/lol/spectator/v5/active-games/by-summoner/${puuid}`, { ttl: 15_000, notFound: { message: "No está en partida", code: "NOT_IN_GAME" } });
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

// Historial de rango: fotos diarias de Solo/Dúo y Flex. Pedirlo también le dice al servidor que siga guardando a ese
// jugador (los últimos 30 días), y si aún no hay ninguna foto toma la primera ahora mismo. Son datos públicos de rango.
const PUUID_RE = /^[A-Za-z0-9_-]{20,100}$/;

router.get("/history/:puuid", handle(async (req, res) => {
  const store = storeRef.get();
  if (!store) throw new HttpError(503, "El historial no está disponible ahora", { code: "DEVICES_UNAVAILABLE" });
  const puuid = puuidOf(req);
  const region = regionOf(req);
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 180, 7), 400);
  const now = Date.now();

  await store.touchTrack([{ puuid, region }], now);
  let list = await store.listRank(puuid, rank.dayKey(now - days * 86_400_000));
  if (list.length === 0) {
    const entries = await riotGet(`${platformHost(region)}${PATHS.lol.ranked(puuid)}`, { ttl: 2 * MIN });
    const doc = { puuid, region, day: rank.dayKey(now), at: now, ...rank.snapshotFromEntries(entries) };
    await store.putRank(doc);
    list = [doc];
  }
  res.json({ snapshots: list.map(({ day, solo, flex }) => ({ day, solo, flex })) });
}));

// La app avisa de sus favoritos (una vez al día) para que el servidor siga guardando su historial
router.post("/history/touch", handle(async (req, res) => {
  const store = storeRef.get();
  if (!store) throw new HttpError(503, "El historial no está disponible ahora", { code: "DEVICES_UNAVAILABLE" });
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  const valid = items.filter(i => i && PUUID_RE.test(String(i.puuid)) && isRegion(i.region)).map(i => ({ puuid: i.puuid, region: i.region }));
  await store.touchTrack(valid, Date.now());
  res.json({ ok: true, count: valid.length });
}));

module.exports = router;
