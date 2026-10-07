const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream } = require("../lib/upstream");

/**
 * Dota 2 vía OpenDota (https://docs.opendota.com). No necesita key (60 peticiones/min); con OPENDOTA_API_KEY
 * los límites suben. Los datos completos exigen que el jugador tenga activada la opción de exponer sus partidas.
 *   GET /search?q=nombre      jugadores con ese nombre de Steam
 *   GET /heroes               héroes (id, nombre interno, nombre visible)
 *   GET /player/:id           perfil (ID de cuenta o Steam64) con victorias, partidas recientes y héroes
 *   GET /match/:id            detalle de una partida: los 10 jugadores con objetos, oro, daño y la ventaja de oro
 *   GET /items                objetos: id -> { key, name, cost } (la imagen sale del CDN de Steam con `key`)
 */
const upstream = createUpstream({
  id: "dota2",
  name: "OpenDota",
  base: "https://api.opendota.com/api",
  baseEnv: "OPENDOTA_API_BASE",
  keyEnv: "OPENDOTA_API_KEY",
  optional: true,
  timeout: 20000,   // OpenDota tarda bastante en la búsqueda por nombre
  query: key => (key ? { api_key: key } : {}),
});

const router = Router();
const MIN = 60_000;
const STEAM64_BASE = 76561197960265728n;

// "105248644" (ID de cuenta) o "76561198065514372" (Steam64) -> ID de cuenta
function accountIdOf(raw) {
  const text = String(raw || "").trim();
  if (!/^\d{1,20}$/.test(text)) throw new HttpError(400, "ID de jugador no válido", { code: "INVALID_ID" });
  const n = BigInt(text);
  return String(n >= STEAM64_BASE ? n - STEAM64_BASE : n);
}

const heroesList = () => upstream.get("/heroes", { ttl: 24 * 60 * MIN });

router.get("/heroes", handle(async (_req, res) => {
  const heroes = await heroesList();
  res.json({
    items: heroes.map(h => ({ id: h.id, name: String(h.name).replace("npc_dota_hero_", ""), label: h.localized_name, attr: h.primary_attr })),
  });
}));

router.get("/search", handle(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2 || q.length > 40) throw new HttpError(400, "Escribe al menos 2 letras", { code: "INVALID_QUERY" });
  const found = await upstream.get("/search", { ttl: 2 * MIN, query: { q } });
  res.json({
    items: (found || []).slice(0, 15).map(p => ({
      id: String(p.account_id), name: p.personaname, avatar: p.avatarfull || null, lastMatch: p.last_match_time || null,
    })),
  });
}));

router.get("/player/:id", handle(async (req, res) => {
  const id = accountIdOf(req.params.id);
  const notFound = { message: "Jugador no encontrado", code: "PLAYER_NOT_FOUND" };
  const player = await upstream.get(`/players/${id}`, { ttl: 2 * MIN, notFound });
  if (!player?.profile) throw new HttpError(404, "Jugador no encontrado", { code: "PLAYER_NOT_FOUND" });

  // El resto es opcional: sin partidas públicas el perfil se muestra igual
  const [wl, recent, heroes] = await Promise.allSettled([
    upstream.get(`/players/${id}/wl`, { ttl: 2 * MIN }),
    upstream.get(`/players/${id}/recentMatches`, { ttl: 2 * MIN }),
    upstream.get(`/players/${id}/heroes`, { ttl: 10 * MIN }),
  ]);
  const value = r => (r.status === "fulfilled" ? r.value : null);
  const p = player.profile;

  res.json({
    id,
    profile: { name: p.personaname || p.name || id, avatar: p.avatarfull || p.avatar || null, steamId: p.steamid || null, country: p.loccountrycode || null, plus: Boolean(p.plus) },
    rankTier: player.rank_tier ?? null,
    leaderboardRank: player.leaderboard_rank ?? null,
    wins: value(wl)?.win ?? 0,
    losses: value(wl)?.lose ?? 0,
    recent: (value(recent) || []).map(m => ({
      matchId: m.match_id,
      heroId: m.hero_id,
      win: (m.player_slot < 128) === Boolean(m.radiant_win),
      kills: m.kills, deaths: m.deaths, assists: m.assists,
      duration: m.duration,
      startTime: m.start_time,
      gameMode: m.game_mode,
      lobbyType: m.lobby_type,
      goldPerMin: m.gold_per_min, xpPerMin: m.xp_per_min, lastHits: m.last_hits, heroDamage: m.hero_damage,
    })),
    heroes: (value(heroes) || []).filter(h => h.games > 0).slice(0, 10).map(h => ({
      heroId: h.hero_id, games: h.games, wins: h.win, lastPlayed: h.last_played,
    })),
  });
}));

router.get("/items", handle(async (_req, res) => {
  const items = await upstream.get("/constants/items", { ttl: 24 * 60 * MIN });
  const out = {};
  for (const [key, it] of Object.entries(items || {})) {
    if (it && Number.isFinite(it.id)) out[it.id] = { key, name: it.dname || key, cost: it.cost ?? null };
  }
  res.json({ items: out });
}));

const ITEM_SLOTS = ["item_0", "item_1", "item_2", "item_3", "item_4", "item_5"];
const BACKPACK = ["backpack_0", "backpack_1", "backpack_2"];

/** Detalle de partida de OpenDota reducido a lo que muestra la web */
function reduceMatch(m) {
  return {
    matchId: m.match_id,
    radiantWin: Boolean(m.radiant_win),
    duration: m.duration,
    startTime: m.start_time,
    gameMode: m.game_mode,
    lobbyType: m.lobby_type,
    radiantScore: m.radiant_score ?? null,
    direScore: m.dire_score ?? null,
    // Ventaja de oro del Radiant minuto a minuto (negativa = va ganando el Dire); solo en partidas analizadas
    goldAdvantage: Array.isArray(m.radiant_gold_adv) ? m.radiant_gold_adv : null,
    players: (m.players || []).map(p => ({
      accountId: p.account_id ? String(p.account_id) : null,
      name: p.personaname || null,
      radiant: p.isRadiant ?? p.player_slot < 128,
      heroId: p.hero_id,
      level: p.level,
      kills: p.kills, deaths: p.deaths, assists: p.assists,
      lastHits: p.last_hits, denies: p.denies,
      goldPerMin: p.gold_per_min, xpPerMin: p.xp_per_min,
      netWorth: p.net_worth ?? p.total_gold ?? null,
      heroDamage: p.hero_damage ?? 0, towerDamage: p.tower_damage ?? 0, heroHealing: p.hero_healing ?? 0,
      items: ITEM_SLOTS.map(k => p[k] || 0),
      backpack: BACKPACK.map(k => p[k] || 0),
      neutral: p.item_neutral || 0,
      rankTier: p.rank_tier ?? null,
    })),
  };
}

router.get("/match/:id", handle(async (req, res) => {
  const id = String(req.params.id || "");
  if (!/^\d{1,20}$/.test(id)) throw new HttpError(400, "ID de partida no válido", { code: "INVALID_MATCH_ID" });
  const match = await upstream.get(`/matches/${id}`, { ttl: 60 * MIN, notFound: { message: "Partida no encontrada", code: "MATCH_NOT_FOUND" } });
  if (!match?.players) throw new HttpError(404, "Partida no encontrada", { code: "MATCH_NOT_FOUND" });
  res.json(reduceMatch(match));
}));

module.exports = { router, upstream, accountIdOf, reduceMatch };
