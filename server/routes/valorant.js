const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream } = require("../lib/upstream");
const ps = require("../lib/pandascore");

/**
 * Valorant: solo esports por ahora (los perfiles de jugador necesitan una production key de Riot para Valorant).
 *   GET /esports      en vivo, próximos, resultados, torneos en curso y próximos, y el último campeón (PandaScore)
 *   GET /match/:id    un partido
 */
const esports = createUpstream({
  id: "valorant-esports",
  name: "PandaScore",
  base: "https://api.pandascore.co",
  baseEnv: "PANDASCORE_BASE",
  keyEnv: "PANDASCORE_TOKEN",
  headers: key => ({ Authorization: `Bearer ${key}`, Accept: "application/json" }),
});

const MIN = 60 * 1000;
const router = Router();
const base = "/valorant";

router.get("/esports", handle(async (req, res) => {
  const [running, upcoming, past, current, next, finals] = await Promise.all([
    esports.get(`${base}/matches/running`, { ttl: MIN, query: { per_page: 10 } }),
    esports.get(`${base}/matches/upcoming`, { ttl: 5 * MIN, query: { per_page: 50, sort: "begin_at" } }),
    esports.get(`${base}/matches/past`, { ttl: 5 * MIN, query: { per_page: 20 } }),
    esports.get(`${base}/tournaments/running`, { ttl: 30 * MIN, query: { per_page: 10 } }),
    esports.get(`${base}/tournaments/upcoming`, { ttl: 30 * MIN, query: { per_page: 10, sort: "begin_at" } }),
    // La última gran final jugada: su ganador es el "campeón" que se muestra en Inicio
    esports.get(`${base}/matches/past`, { ttl: 30 * MIN, query: { per_page: 1, "search[name]": "Grand Final" } }),
  ]);
  res.set("Cache-Control", "public, max-age=60");
  res.json({
    running: (running || []).map(ps.normalizeMatch),
    upcoming: (upcoming || []).map(ps.normalizeMatch),
    past: (past || []).map(ps.normalizeMatch),
    tournaments: [...(current || []), ...(next || [])].map(ps.normalizeTournament),
    champion: finals?.[0] ? ps.normalizeMatch(finals[0]) : null,
  });
}));

router.get("/match/:id", handle(async (req, res) => {
  const id = String(req.params.id);
  if (!/^\d{1,10}$/.test(id)) throw new HttpError(400, "Partido no válido", { code: "INVALID_MATCH_ID" });
  const match = await esports.get(`/matches/${id}`, { ttl: MIN, notFound: { message: "Partido no encontrado", code: "MATCH_NOT_FOUND" } });
  if (match?.videogame?.slug && match.videogame.slug !== "valorant") throw new HttpError(404, "Partido no encontrado", { code: "MATCH_NOT_FOUND" });
  res.set("Cache-Control", "public, max-age=60");
  res.json(ps.normalizeMatch(match));
}));

// Sin PANDASCORE_TOKEN no hay nada que mostrar: Valorant aparece como "pronto"
module.exports = { router, upstream: esports };
