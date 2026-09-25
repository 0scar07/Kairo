const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream } = require("../lib/upstream");

/**
 * PUBG vía la API oficial (https://documentation.pubg.com). Key gratuita en developer.pubg.com (PUBG_API_KEY);
 * el límite es de 10 peticiones por minuto en todo salvo las partidas (que no cuentan).
 *   GET /player/:name?platform=steam|kakao|psn|xbox
 */
const upstream = createUpstream({
  id: "pubg",
  name: "PUBG",
  base: "https://api.pubg.com",
  baseEnv: "PUBG_API_BASE",
  keyEnv: "PUBG_API_KEY",
  headers: key => ({ Authorization: `Bearer ${key}`, Accept: "application/vnd.api+json" }),
});

const router = Router();
const PLATFORMS = ["steam", "kakao", "psn", "xbox"];
const MIN = 60_000;
const MATCHES = 8;
const MODE_FIELDS = ["roundsPlayed", "wins", "top10s", "kills", "assists", "damageDealt", "headshotKills", "longestKill", "dBNOs", "losses", "timeSurvived"];
const RANKED_FIELDS = ["currentRankPoint", "bestRankPoint", "roundsPlayed", "wins", "kills", "deaths", "assists", "damageDealt", "avgRank", "top10Ratio", "winRatio", "kda"];

const pick = (obj, fields) => Object.fromEntries(fields.filter(f => obj?.[f] != null).map(f => [f, obj[f]]));

async function currentSeason(platform) {
  const seasons = await upstream.get(`/shards/${platform}/seasons`, { ttl: 6 * 60 * MIN });
  return (seasons?.data || []).find(s => s.attributes?.isCurrentSeason)?.id || null;
}

// Una partida terminada nunca cambia: se resume lo del jugador (y se cachea una hora)
async function matchSummary(platform, matchId, playerId) {
  const match = await upstream.get(`/shards/${platform}/matches/${matchId}`, { ttl: 60 * MIN });
  const me = (match?.included || []).find(i => i.type === "participant" && i.attributes?.stats?.playerId === playerId);
  if (!me) return null;
  const a = match.data?.attributes || {};
  return {
    id: matchId,
    createdAt: a.createdAt,
    map: a.mapName,
    mode: a.gameMode,
    duration: a.duration,
    stats: pick(me.attributes.stats, ["kills", "assists", "damageDealt", "winPlace", "timeSurvived", "headshotKills", "DBNOs", "revives"]),
  };
}

router.get("/player/:name", handle(async (req, res) => {
  const name = String(req.params.name || "").trim();
  if (name.length < 3 || name.length > 40) throw new HttpError(400, "Nombre no válido", { code: "INVALID_NAME" });
  const platform = String(req.query.platform || "steam").toLowerCase();
  if (!PLATFORMS.includes(platform)) throw new HttpError(400, "Plataforma no válida", { code: "INVALID_PLATFORM" });

  const found = await upstream.get(`/shards/${platform}/players`, {
    ttl: 5 * MIN,
    query: { "filter[playerNames]": name },
    notFound: { message: "Jugador no encontrado", code: "PLAYER_NOT_FOUND" },
  });
  const player = found?.data?.[0];
  if (!player) throw new HttpError(404, "Jugador no encontrado", { code: "PLAYER_NOT_FOUND" });

  // Temporada actual y sus estadísticas (normales y clasificatorias); lo que falle queda vacío
  const seasonId = await currentSeason(platform).catch(() => null);
  const [normal, ranked] = seasonId ? await Promise.allSettled([
    upstream.get(`/shards/${platform}/players/${player.id}/seasons/${seasonId}`, { ttl: MIN }),
    upstream.get(`/shards/${platform}/players/${player.id}/seasons/${seasonId}/ranked`, { ttl: MIN }),
  ]) : [null, null];

  const modes = {};
  const gameModeStats = normal?.status === "fulfilled" ? normal.value?.data?.attributes?.gameModeStats || {} : {};
  for (const [mode, stats] of Object.entries(gameModeStats)) if (stats.roundsPlayed > 0) modes[mode] = pick(stats, MODE_FIELDS);

  const rankedModes = {};
  const rankedStats = ranked?.status === "fulfilled" ? ranked.value?.data?.attributes?.rankedGameModeStats || {} : {};
  for (const [mode, stats] of Object.entries(rankedStats)) {
    if (stats.roundsPlayed > 0) rankedModes[mode] = { ...pick(stats, RANKED_FIELDS), tier: stats.currentTier?.tier || null, subTier: stats.currentTier?.subTier || null };
  }

  // Últimas partidas (las más recientes primero); una que falle se omite
  const ids = (player.relationships?.matches?.data || []).slice(0, MATCHES).map(m => m.id);
  const matches = (await Promise.allSettled(ids.map(id => matchSummary(platform, id, player.id))))
    .filter(r => r.status === "fulfilled" && r.value).map(r => r.value);

  res.json({ player: { id: player.id, name: player.attributes?.name || name, platform }, seasonId, modes, ranked: rankedModes, matches });
}));

module.exports = { router, upstream };
