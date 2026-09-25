const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");

// Un upstream falso que hace de OpenDota, Fortnite-API, Apex Legends Status y PUBG a la vez (cada uno con su prefijo)
const seen = [];
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const upstream = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  seen.push({ path: url.pathname, query: Object.fromEntries(url.searchParams), auth: req.headers.authorization });
  const p = url.pathname;

  // --- OpenDota
  if (p === "/dota/players/1050") return json(res, 200, { profile: { personaname: "Prueba", avatarfull: "a.jpg", steamid: "7656", loccountrycode: "CO", plus: true }, rank_tier: 63, leaderboard_rank: null });
  if (p === "/dota/players/1050/wl") return json(res, 200, { win: 10, lose: 5 });
  if (p === "/dota/players/1050/recentMatches") return json(res, 200, [
    { match_id: 1, player_slot: 0, radiant_win: true, hero_id: 4, kills: 5, deaths: 2, assists: 9, duration: 1800, start_time: 100, game_mode: 22, lobby_type: 7 },
    { match_id: 2, player_slot: 130, radiant_win: true, hero_id: 5, kills: 1, deaths: 7, assists: 3, duration: 2100, start_time: 90, game_mode: 22, lobby_type: 7 },
  ]);
  if (p === "/dota/players/1050/heroes") return json(res, 200, [{ hero_id: 4, games: 8, win: 5, last_played: 100 }, { hero_id: 9, games: 0, win: 0, last_played: 0 }]);
  if (p === "/dota/players/999") return json(res, 200, { profile: null });
  if (p === "/dota/search") return json(res, 200, [{ account_id: 1050, personaname: url.searchParams.get("q"), avatarfull: "a.jpg", last_match_time: "2026-01-01" }]);
  if (p === "/dota/heroes") return json(res, 200, [{ id: 1, name: "npc_dota_hero_antimage", localized_name: "Anti-Mage", primary_attr: "agi" }]);

  // --- Fortnite-API
  if (p === "/fn/v2/stats/br/v2") {
    const name = url.searchParams.get("name");
    if (name === "Privado") return json(res, 403, { status: 403 });
    if (name === "Nadie") return json(res, 404, { status: 404 });
    return json(res, 200, { status: 200, data: { account: { id: "abc", name }, battlePass: { level: 50, progress: 10 },
      stats: { all: { overall: { wins: 12, kills: 340, kd: 2.5, matches: 200, winRate: 6, secreto: 1 }, solo: { wins: 3 }, squad: null } } } });
  }

  // --- Apex Legends Status
  if (p === "/apex/bridge") {
    const name = url.searchParams.get("player");
    if (name === "SinKey") { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end("Unauthorized format"); }
    if (name === "Nadie") return json(res, 404, { Error: "Player not found" });
    return json(res, 200, { global: { name, uid: "1", level: 300, toNextLevelPercent: 40, bans: { isActive: false }, rank: { rankScore: 7000, rankName: "Platinum", rankDiv: 2, ladderPosPlatform: -1, rankImg: "r.png", rankedSeason: "s25" } },
      realtime: { isOnline: 1, isInGame: 0, lobbyState: "open", selectedLegend: "Wraith" },
      legends: { selected: { LegendName: "Wraith", ImgAssets: { icon: "i.png", banner: "b.png" }, data: [{ name: "Kills", value: 99, key: "kills" }] } },
      total: { kills: { name: "Kills", value: 1200 }, raro: "x" } });
  }

  // --- PUBG
  if (p === "/pubg/shards/steam/players") {
    if (url.searchParams.get("filter[playerNames]") === "Nadie") return json(res, 404, { errors: [] });
    return json(res, 200, { data: [{ id: "account.1", attributes: { name: "Prueba" }, relationships: { matches: { data: [{ id: "m1" }, { id: "m2" }] } } }] });
  }
  if (p === "/pubg/shards/steam/seasons") return json(res, 200, { data: [{ id: "old", attributes: { isCurrentSeason: false } }, { id: "s1", attributes: { isCurrentSeason: true } }] });
  if (p === "/pubg/shards/steam/players/account.1/seasons/s1") return json(res, 200, { data: { attributes: { gameModeStats: { squad: { roundsPlayed: 10, wins: 2, kills: 20, top10s: 5, damageDealt: 3000, extra: 1 }, solo: { roundsPlayed: 0 } } } } });
  if (p === "/pubg/shards/steam/players/account.1/seasons/s1/ranked") return json(res, 200, { data: { attributes: { rankedGameModeStats: { squad: { roundsPlayed: 4, currentTier: { tier: "Gold", subTier: "2" }, currentRankPoint: 2100, kills: 8 } } } } });
  if (p === "/pubg/shards/steam/matches/m1") return json(res, 200, { data: { attributes: { createdAt: "2026-01-01", mapName: "Baltic_Main", gameMode: "squad-fpp", duration: 1500 } },
    included: [{ type: "participant", attributes: { stats: { playerId: "account.1", kills: 3, winPlace: 2, damageDealt: 400.5, timeSurvived: 1200 } } }, { type: "participant", attributes: { stats: { playerId: "otro", kills: 9 } } }] });
  if (p === "/pubg/shards/steam/matches/m2") return json(res, 404, {});   // una partida que falla se omite
  json(res, 404, { desconocido: p });
});

let server, base;
test.before(async () => {
  await new Promise(r => upstream.listen(0, r));
  const root = `http://127.0.0.1:${upstream.address().port}`;
  Object.assign(process.env, {
    OPENDOTA_API_BASE: `${root}/dota`,
    FORTNITE_API_BASE: `${root}/fn`, FORTNITE_API_KEY: "clave-fn",
    APEX_API_BASE: `${root}/apex`, APEX_API_KEY: "clave-apex",
    PUBG_API_BASE: `${root}/pubg`, PUBG_API_KEY: "clave-pubg",
  });
  const extra = require("../lib/extra");
  const { errorHandler } = require("../lib/riot");
  const app = express();
  for (const [id, m] of Object.entries(extra.ROUTES)) app.use(`/${id}`, m.router);
  app.use(errorHandler);
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); upstream.close(); });

const get = async path => { const r = await fetch(base + path); return { status: r.status, body: await r.json() }; };

test("Dota 2: un ID de Steam64 se convierte al ID de cuenta y el perfil llega normalizado", async () => {
  const { accountIdOf } = require("../routes/dota2");
  assert.strictEqual(accountIdOf("76561197960266778"), "1050");
  assert.strictEqual(accountIdOf("1050"), "1050");
  assert.throws(() => accountIdOf("abc"), /no válido/);

  const { status, body } = await get("/dota2/player/1050");
  assert.strictEqual(status, 200);
  assert.strictEqual(body.profile.name, "Prueba");
  assert.strictEqual(body.rankTier, 63);
  assert.deepStrictEqual([body.wins, body.losses], [10, 5]);
  assert.deepStrictEqual(body.recent.map(m => m.win), [true, false]);   // slot < 128 = Radiant; el segundo era Dire y ganó Radiant
  assert.strictEqual(body.heroes.length, 1);                            // los héroes con 0 partidas se descartan
});

test("Dota 2: jugador inexistente, búsqueda y lista de héroes", async () => {
  const missing = await get("/dota2/player/999");
  assert.strictEqual(missing.status, 404);
  assert.strictEqual(missing.body.code, "PLAYER_NOT_FOUND");

  const short = await get("/dota2/search?q=a");
  assert.strictEqual(short.status, 400);
  assert.strictEqual(short.body.code, "INVALID_QUERY");

  const search = await get("/dota2/search?q=Miracle");
  assert.strictEqual(search.body.items[0].id, "1050");

  const heroes = await get("/dota2/heroes");
  assert.deepStrictEqual(heroes.body.items[0], { id: 1, name: "antimage", label: "Anti-Mage", attr: "agi" });
});

test("Fortnite: envía la key en Authorization, recorta los campos y distingue cuenta privada", async () => {
  const ok = await get("/fortnite/player/Tester?platform=psn");
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.account.name, "Tester");
  assert.deepStrictEqual(ok.body.stats.overall, { wins: 12, kills: 340, kd: 2.5, matches: 200, winRate: 6 });   // sin "secreto"
  assert.ok(!("squad" in ok.body.stats), "los modos nulos no se envían");
  const call = seen.find(s => s.path === "/fn/v2/stats/br/v2" && s.query.name === "Tester");
  assert.strictEqual(call.auth, "clave-fn");
  assert.strictEqual(call.query.accountType, "psn");

  assert.strictEqual((await get("/fortnite/player/Privado")).body.code, "PROFILE_PRIVATE");
  assert.strictEqual((await get("/fortnite/player/Nadie")).body.code, "PLAYER_NOT_FOUND");
  assert.strictEqual((await get("/fortnite/player/Tester?platform=switch")).body.code, "INVALID_PLATFORM");
});

test("Apex: rango, leyenda seleccionada y estado en línea; los errores del cuerpo se traducen", async () => {
  const ok = await get("/apex/player/Tester?platform=PS4");
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.global.rank.name, "Platinum");
  assert.strictEqual(ok.body.realtime.online, true);
  assert.strictEqual(ok.body.realtime.inGame, false);
  assert.strictEqual(ok.body.legend.banner, "b.png");
  assert.deepStrictEqual(ok.body.totals, { kills: { name: "Kills", value: 1200 } });
  assert.strictEqual(seen.find(s => s.path === "/apex/bridge" && s.query.player === "Tester").auth, "clave-apex");

  const unauthorized = await get("/apex/player/SinKey");   // texto plano, no JSON
  assert.strictEqual(unauthorized.status, 503);
  assert.strictEqual(unauthorized.body.code, "KEY_INVALID");

  const missing = await get("/apex/player/Nadie");
  assert.strictEqual(missing.status, 404);
  assert.strictEqual(missing.body.code, "PLAYER_NOT_FOUND");
});

test("PUBG: temporada actual, estadísticas, clasificatorio y resumen de partidas (las que fallan se omiten)", async () => {
  const { status, body } = await get("/pubg/player/Prueba?platform=steam");
  assert.strictEqual(status, 200);
  assert.strictEqual(body.seasonId, "s1");
  assert.deepStrictEqual(Object.keys(body.modes), ["squad"]);          // solo con partidas jugadas
  assert.strictEqual(body.modes.squad.kills, 20);
  assert.ok(!("extra" in body.modes.squad));
  assert.strictEqual(body.ranked.squad.tier, "Gold");
  assert.strictEqual(body.matches.length, 1);
  assert.strictEqual(body.matches[0].stats.kills, 3);
  assert.strictEqual(body.matches[0].map, "Baltic_Main");
  assert.strictEqual(seen.find(s => s.path.endsWith("/seasons")).auth, "Bearer clave-pubg");

  assert.strictEqual((await get("/pubg/player/Nadie?platform=steam")).body.code, "PLAYER_NOT_FOUND");
});

test("sin key, Fortnite, Apex y PUBG responden NOT_CONFIGURED y no aparecen disponibles; Dota 2 sí", async () => {
  const saved = { ...process.env };
  delete process.env.FORTNITE_API_KEY; delete process.env.APEX_API_KEY; delete process.env.PUBG_API_KEY;
  try {
    for (const path of ["/fortnite/player/Tester", "/apex/player/Tester", "/pubg/player/Tester"]) {
      const r = await get(path);
      assert.strictEqual(r.status, 503, path);
      assert.strictEqual(r.body.code, "NOT_CONFIGURED", path);
    }
    const games = require("../lib/access").games();
    assert.deepStrictEqual([games.dota2, games.fortnite, games.apex, games.pubg], [true, false, false, false]);
  } finally {
    Object.assign(process.env, saved);
  }
});
