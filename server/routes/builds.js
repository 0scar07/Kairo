const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { championSummary, metaSummary } = require("../lib/builds");

/**
 * Builds de los Challenger (lib/builds.js, las junta lib/buildsJob.js):
 *   GET /lol/builds               campeones del parche más reciente con partidas y victorias
 *   GET /lol/builds/:championId   objetos, runas, hechizos y posición más usados con ese campeón
 */
function createBuildsRouter(job) {
  const router = Router();
  router.get("/", handle(async (_req, res) => {
    res.json(metaSummary(await job.aggregate()));
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
