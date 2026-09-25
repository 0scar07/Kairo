const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream } = require("../lib/upstream");

/**
 * Fortnite vía Fortnite-API (https://fortnite-api.com), una API comunitaria gratuita que exige key
 * (FORTNITE_API_KEY, en dash.fortnite-api.com). Las estadísticas solo se ven si la cuenta las tiene públicas.
 *   GET /player/:name?platform=epic|psn|xbl
 */
const upstream = createUpstream({
  id: "fortnite",
  name: "Fortnite-API",
  base: "https://fortnite-api.com",
  baseEnv: "FORTNITE_API_BASE",
  keyEnv: "FORTNITE_API_KEY",
  headers: key => ({ Authorization: key }),
});

const router = Router();
const PLATFORMS = ["epic", "psn", "xbl"];
const MODES = ["overall", "solo", "duo", "trio", "squad"];
const FIELDS = [
  "score", "scorePerMatch", "wins", "top3", "top5", "top6", "top10", "top12", "top25",
  "kills", "killsPerMatch", "killsPerMin", "deaths", "kd", "matches", "winRate", "minutesPlayed", "playersOutlived",
];

// 403 = estadísticas privadas (no es un problema de la key)
const mapError = e => {
  if (e.response?.status === 403) return new HttpError(403, "Las estadísticas de esta cuenta son privadas", { code: "PROFILE_PRIVATE" });
  return null;
};

const pick = (obj, fields) => Object.fromEntries(fields.filter(f => obj?.[f] != null).map(f => [f, obj[f]]));

router.get("/player/:name", handle(async (req, res) => {
  const name = String(req.params.name || "").trim();
  if (name.length < 3 || name.length > 40) throw new HttpError(400, "Nombre no válido", { code: "INVALID_NAME" });
  const platform = String(req.query.platform || "epic").toLowerCase();
  if (!PLATFORMS.includes(platform)) throw new HttpError(400, "Plataforma no válida", { code: "INVALID_PLATFORM" });

  const body = await upstream.get("/v2/stats/br/v2", {
    ttl: 60_000,
    query: { name, accountType: platform, timeWindow: "lifetime" },
    notFound: { message: "Jugador no encontrado", code: "PLAYER_NOT_FOUND" },
    mapError,
  });
  const data = body?.data;
  if (!data) throw new HttpError(502, "Respuesta inesperada de Fortnite-API", { code: "UPSTREAM_ERROR", provider: "Fortnite-API" });

  const all = data.stats?.all || {};
  res.json({
    account: { id: data.account?.id, name: data.account?.name || name },
    battlePass: data.battlePass ? { level: data.battlePass.level, progress: data.battlePass.progress } : null,
    stats: Object.fromEntries(MODES.filter(m => all[m]).map(m => [m, pick(all[m], FIELDS)])),
  });
}));

module.exports = { router, upstream };
