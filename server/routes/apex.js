const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream } = require("../lib/upstream");

/**
 * Apex Legends vía Apex Legends Status (https://apexlegendsapi.com), API comunitaria gratuita que exige key
 * (APEX_API_KEY). Límite de la key gratuita: ~1 petición cada 2 s.
 *   GET /player/:name?platform=PC|PS4|X1
 */
const upstream = createUpstream({
  id: "apex",
  name: "Apex Legends Status",
  base: "https://api.apexlegendsstatus.com",   // antes mozambiquehe.re: el portal ahora documenta este host
  baseEnv: "APEX_API_BASE",
  keyEnv: "APEX_API_KEY",
  headers: key => ({ Authorization: key }),
});

const router = Router();
const PLATFORMS = ["PC", "PS4", "X1"];

// Esta API a veces responde 200/4xx con { Error: "..." } en vez de un código claro
function errorFromBody(data) {
  const text = String(data?.Error || "");
  if (/not found|no player|couldn't find/i.test(text)) return new HttpError(404, "Jugador no encontrado", { code: "PLAYER_NOT_FOUND" });
  if (/rate|too many|limit/i.test(text)) return new HttpError(429, "Apex Legends Status limitó las solicitudes, reintenta en 5 s", { code: "RATE_LIMITED", retryAfter: 5, provider: "Apex Legends Status" });
  if (/api key|auth/i.test(text)) return new HttpError(503, "Apex Legends Status rechazó la consulta: la key no es válida", { code: "KEY_INVALID", provider: "Apex Legends Status" });
  return new HttpError(502, "Apex Legends Status tuvo un problema, intenta de nuevo", { code: "UPSTREAM_ERROR", provider: "Apex Legends Status" });
}

const mapError = e => (e.response?.data?.Error ? errorFromBody(e.response.data) : null);

router.get("/player/:name", handle(async (req, res) => {
  const name = String(req.params.name || "").trim();
  if (name.length < 1 || name.length > 40) throw new HttpError(400, "Nombre no válido", { code: "INVALID_NAME" });
  const platform = String(req.query.platform || "PC").toUpperCase();
  if (!PLATFORMS.includes(platform)) throw new HttpError(400, "Plataforma no válida", { code: "INVALID_PLATFORM" });

  const data = await upstream.get("/bridge", {
    ttl: 60_000,
    query: { player: name, platform, version: 5 },
    notFound: { message: "Jugador no encontrado", code: "PLAYER_NOT_FOUND" },
    mapError,
  });
  if (data?.Error) throw errorFromBody(data);
  if (!data?.global) throw new HttpError(404, "Jugador no encontrado", { code: "PLAYER_NOT_FOUND" });

  const g = data.global;
  const selected = data.legends?.selected;
  res.json({
    global: {
      name: g.name, uid: g.uid, avatar: g.avatar || null, platform: g.platform, level: g.level,
      toNextLevelPercent: g.toNextLevelPercent ?? null,
      banned: Boolean(g.bans?.isActive),
      rank: g.rank ? {
        score: g.rank.rankScore, name: g.rank.rankName, division: g.rank.rankDiv,
        ladderPos: g.rank.ladderPosPlatform ?? null, image: g.rank.rankImg || null, season: g.rank.rankedSeason || null,
      } : null,
    },
    realtime: data.realtime ? {
      online: data.realtime.isOnline === 1 || data.realtime.isOnline === true,
      inGame: data.realtime.isInGame === 1 || data.realtime.isInGame === true,
      lobbyState: data.realtime.lobbyState || null,
      legend: data.realtime.selectedLegend || null,
    } : null,
    legend: selected ? {
      name: selected.LegendName,
      icon: selected.ImgAssets?.icon || null,
      banner: selected.ImgAssets?.banner || null,
      stats: (selected.data || []).map(s => ({ key: s.key || s.name, name: s.name, value: s.value })),
    } : null,
    totals: Object.fromEntries(Object.entries(data.total || {}).filter(([, v]) => v && typeof v.value === "number").map(([k, v]) => [k, { name: v.name || k, value: v.value }])),
  });
}));

module.exports = { router, upstream };
