const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { championSummary, metaSummary, matchupSummary, opponentsOf, popularMatchups } = require("../lib/builds");

/**
 * Builds de los Challenger (lib/builds.js, las junta lib/buildsJob.js):
 *   GET /lol/builds               campeones del parche más reciente con partidas y victorias
 *   GET /lol/builds/:championId   objetos, runas, hechizos y posición más usados con ese campeón
 *   GET /lol/builds/matchups?position=MIDDLE        cruces más jugados de esa línea (para la lupa)
 *   GET /lol/builds/:championId/opponents?position=  rivales de línea más frecuentes del campeón, con su winrate
 *   GET /lol/builds/:championId/vs/:enemyId          el cruce: build, runas, habilidades, counters y daño del rival
 */
const POSITIONS = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const champOf = value => {
  const id = String(value);
  if (!/^\d{1,4}$/.test(id)) throw new HttpError(400, "Campeón no válido", { code: "INVALID_CHAMPION" });
  return id;
};
const positionOf = value => (POSITIONS.includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : null);
function createBuildsRouter(job) {
  const router = Router();
  router.get("/", handle(async (_req, res) => {
    res.json(metaSummary(await job.aggregate()));
  }));
  router.get("/matchups", handle(async (req, res) => {
    res.json(popularMatchups(await job.aggregate(), positionOf(req.query.position) || "MIDDLE"));
  }));
  router.get("/:championId/opponents", handle(async (req, res) => {
    res.json(opponentsOf(await job.aggregate(), champOf(req.params.championId), { position: positionOf(req.query.position) }));
  }));
  router.get("/:championId/vs/:enemyId", handle(async (req, res) => {
    const summary = matchupSummary(await job.aggregate(), champOf(req.params.championId), champOf(req.params.enemyId));
    if (!summary) throw new HttpError(404, "Todavía no hay partidas de Challenger con este campeón", { code: "NO_BUILD_DATA" });
    res.json(summary);
  }));
  router.get("/:championId", handle(async (req, res) => {
    const id = String(req.params.championId);
    if (!/^\d{1,4}$/.test(id)) throw new HttpError(400, "Campeón no válido", { code: "INVALID_CHAMPION" });
    const summary = championSummary(await job.aggregate(), id);
    if (!summary) throw new HttpError(404, "Todavía no hay partidas de Challenger con este campeón", { code: "NO_BUILD_DATA" });
    res.json(summary);
  }));
  return router;
}

module.exports = { createBuildsRouter };
