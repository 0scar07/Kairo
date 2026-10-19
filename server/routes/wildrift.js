const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream, cache } = require("../lib/upstream");
const wr = require("../lib/wildrift");

/**
 * Wild Rift (prueba). Sin perfiles de jugador: el meta de campeones y los esports.
 *   GET /meta?rank=diamond|master|challenger|legend   tier list por carril (estadísticas públicas del servidor chino)
 *   GET /champion/:heroId                              un campeón en cada rango y carril
 *   GET /news?lang=es|en|pt|fr|de                     últimas actualizaciones del juego (web oficial)
 *   GET /esports                                       partidos en vivo, próximos, resultados y torneos (PandaScore)
 */
// Estadísticas públicas de campeones del servidor chino (sin key). Se actualizan una vez al día.
const stats = createUpstream({ id: "wildrift-stats", name: "Wild Rift (estadísticas)", base: "https://mlol.qt.qq.com", baseEnv: "WILDRIFT_STATS_BASE", timeout: 10000 });
const heroesApi = createUpstream({ id: "wildrift-heroes", name: "Wild Rift (campeones)", base: "https://game.gtimg.cn", baseEnv: "WILDRIFT_HEROES_BASE", timeout: 10000 });
// Noticias de la web oficial (HTML de Next.js con los datos de la página embebidos)
const site = createUpstream({ id: "wildrift-news", name: "Wild Rift (noticias)", base: "https://wildrift.leagueoflegends.com", baseEnv: "WILDRIFT_NEWS_BASE", timeout: 10000 });
// Esports con PandaScore (key gratuita en pandascore.co)
const esports = createUpstream({
  id: "wildrift-esports",
  name: "PandaScore",
  base: "https://api.pandascore.co",
  baseEnv: "PANDASCORE_BASE",
  keyEnv: "PANDASCORE_TOKEN",
  headers: key => ({ Authorization: `Bearer ${key}`, Accept: "application/json" }),
});

const HOUR = 60 * 60 * 1000;
const router = Router();

// Estas fuentes a veces responden JSON con cabeceras de texto o JavaScript: se acepta en ambas formas
const asJson = data => {
  if (typeof data !== "string") return data;
  try { return JSON.parse(data); } catch { throw new HttpError(502, "Wild Rift devolvió datos ilegibles", { code: "UPSTREAM_ERROR" }); }
};
const loadHeroes = async () => wr.normalizeHeroes(asJson(await heroesApi.get("/images/lgamem/act/lrlib/js/heroList/hero_list.js", { ttl: 12 * HOUR })));
const loadRanks = async () => asJson(await stats.get("/go/lgame_battle_info/hero_rank_list_v2", { ttl: HOUR }));

router.get("/meta", handle(async (req, res) => {
  const rank = String(req.query.rank || "diamond");
  if (!wr.RANK_IDS.includes(rank)) throw new HttpError(400, "Rango no válido", { code: "INVALID_RANK" });
  const [raw, heroes] = await Promise.all([loadRanks(), loadHeroes()]);
  const meta = wr.normalizeMeta(raw, heroes, rank);
  if (!meta) throw new HttpError(502, "Wild Rift no devolvió estadísticas", { code: "UPSTREAM_ERROR" });
  res.set("Cache-Control", "public, max-age=900");
  res.json(meta);
}));

router.get("/champion/:heroId", handle(async (req, res) => {
  const heroId = String(req.params.heroId);
  if (!/^\d{3,8}$/.test(heroId)) throw new HttpError(400, "Campeón no válido", { code: "INVALID_CHAMPION" });
  const [raw, heroes] = await Promise.all([loadRanks(), loadHeroes()]);
  const champ = wr.championStats(raw, heroes, heroId);
  if (!champ) throw new HttpError(404, "Campeón no encontrado", { code: "CHAMPION_NOT_FOUND" });
  res.set("Cache-Control", "public, max-age=900");
  res.json(champ);
}));

router.get("/news", handle(async (req, res) => {
  const locale = wr.NEWS_LOCALES[String(req.query.lang || "en")] || wr.NEWS_LOCALES.en;
  // Se guarda ya resumida (la página pesa ~500 KB)
  const items = await cache.wrap(`wildrift-news:${locale}`, HOUR, async () => {
    const data = wr.nextData(await site.get(`/${locale}/news/game-updates/`));
    if (!data) throw new HttpError(502, "Wild Rift devolvió datos ilegibles", { code: "UPSTREAM_ERROR" });
    return wr.normalizeNews(data);
  });
  res.set("Cache-Control", "public, max-age=1800");
  res.json({ items });
}));

router.get("/esports", handle(async (req, res) => {
  const base = "/lol-wild-rift";
  const [running, upcoming, past, tournaments] = await Promise.all([
    esports.get(`${base}/matches/running`, { ttl: 60 * 1000, query: { per_page: 10 } }),
    esports.get(`${base}/matches/upcoming`, { ttl: 5 * 60 * 1000, query: { per_page: 20, sort: "begin_at" } }),
    esports.get(`${base}/matches/past`, { ttl: 5 * 60 * 1000, query: { per_page: 10 } }),
    esports.get(`${base}/tournaments/running`, { ttl: 30 * 60 * 1000, query: { per_page: 5 } }),
  ]);
  res.set("Cache-Control", "public, max-age=60");
  res.json({
    running: (running || []).map(wr.normalizeMatch),
    upcoming: (upcoming || []).map(wr.normalizeMatch),
    past: (past || []).map(wr.normalizeMatch),
    tournaments: (tournaments || []).map(wr.normalizeTournament),
  });
}));

// El meta no necesita key, así que el juego está siempre disponible; los esports dependen de PANDASCORE_TOKEN
const upstream = { configured: () => true };
module.exports = { router, upstream, esportsConfigured: () => esports.configured() };
