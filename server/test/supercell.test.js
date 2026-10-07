const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");

// Upstream falso de Supercell: comprueba la ruta y la cabecera de autorización que envía el servidor
const seen = [];
const upstream = http.createServer((req, res) => {
  seen.push({ url: req.url, auth: req.headers.authorization });
  const send = (status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.url === "/v1/players/%232222") return send(404, { reason: "notFound" });
  if (req.url === "/v1/players/%23LLLL") return send(403, { reason: "accessDenied.invalidIp" });
  if (req.url === "/v1/players/%23JJJJ") return send(503, { reason: "inMaintenance" });
  if (req.url.startsWith("/v1/rankings/global/players")) return send(200, { items: [{ tag: "#2PP", name: "Top" }] });
  if (req.url.startsWith("/v1/rankings/co/players")) return send(200, { items: [{ tag: "#CO", name: "Colombia" }] });
  if (req.url.startsWith("/v1/rankings/global/brawlers/16000001")) return send(200, { items: [{ tag: "#B1", name: "Colt" }] });
  if (req.url === "/v1/brawlers") return send(200, { items: [{ id: 16000000, name: "SHELLY" }] });
  if (req.url === "/v1/events/rotation") return send(200, [{ startTime: "20261007T080000.000Z", endTime: "20261008T080000.000Z", slotId: 1, event: { id: 15000026, mode: "gemGrab", map: "Hard Rock Mine" } }]);
  if (req.url === "/v1/clubs/%232222") return send(404, { reason: "notFound" });
  if (req.url === "/v1/clubs/%232CLQ") return send(200, { tag: "#2CLQ", name: "Club", members: [{ tag: "#A" }] });
  if (req.url.endsWith("/battlelog")) return send(200, req.url.includes("%239999") ? [{ battleTime: "a" }] : { items: [{ battleTime: "b" }] });
  return send(200, { tag: "#2PP0", name: "Prueba" });
});

let app, server, base;
test.before(async () => {
  await new Promise(r => upstream.listen(0, r));
  const port = upstream.address().port;
  process.env.BRAWLSTARS_API_KEY = "clave-de-prueba";
  process.env.BRAWLSTARS_API_BASE = `http://127.0.0.1:${port}/v1`;
  delete process.env.CLASHOFCLANS_API_KEY;

  const { createSupercellRouter } = require("../routes/supercell");
  const { errorHandler } = require("../lib/riot");
  app = express();
  app.use("/brawlstars", createSupercellRouter("brawlstars"));
  app.use("/clashofclans", createSupercellRouter("clashofclans"));
  app.use(errorHandler);
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); upstream.close(); });

const get = async path => { const r = await fetch(base + path); return { status: r.status, body: await r.json() }; };

test("normalizeTag acepta #, minúsculas y la letra O", () => {
  const { normalizeTag } = require("../lib/supercell");
  assert.strictEqual(normalizeTag("#2pp0"), "2PP0");
  assert.strictEqual(normalizeTag("2PPO"), "2PP0");
  assert.throws(() => normalizeTag("ab"), /Tag no válido/);
  assert.throws(() => normalizeTag("2PP0!"), /Tag no válido/);
});

test("el perfil se pide con el tag codificado y la key en Authorization", async () => {
  const { status, body } = await get("/brawlstars/player/%232pp0");
  assert.strictEqual(status, 200);
  assert.strictEqual(body.name, "Prueba");
  const call = seen.find(s => s.url === "/v1/players/%232PP0");
  assert.ok(call, "el upstream recibió /players/%232PP0");
  assert.strictEqual(call.auth, "Bearer clave-de-prueba");
});

test("las batallas llegan siempre como { items }", async () => {
  assert.deepStrictEqual((await get("/brawlstars/battles/2PP0")).body, { items: [{ battleTime: "b" }] });
  assert.deepStrictEqual((await get("/brawlstars/battles/9999")).body, { items: [{ battleTime: "a" }] });
});

test("404, 403 y 503 de Supercell se traducen a mensajes en español", async () => {
  const notFound = await get("/brawlstars/player/2222");
  assert.strictEqual(notFound.status, 404);
  assert.match(notFound.body.error, /Jugador no encontrado/);

  const denied = await get("/brawlstars/player/LLLL");
  assert.strictEqual(denied.status, 503);
  assert.strictEqual(denied.body.code, "KEY_INVALID");
  assert.strictEqual(denied.body.provider, "Brawl Stars");   // la app lo usa para traducir el mensaje

  const maintenance = await get("/brawlstars/player/JJJJ");
  assert.strictEqual(maintenance.body.code, "MAINTENANCE");
});

test("ranking de Brawl Stars por país y por brawler", async () => {
  assert.strictEqual((await get("/brawlstars/top?country=CO")).body.items[0].name, "Colombia");
  assert.strictEqual((await get("/brawlstars/top?brawler=16000001")).body.items[0].name, "Colt");
  assert.strictEqual((await get("/brawlstars/top?country=colombia")).status, 400);
  assert.strictEqual((await get("/brawlstars/top?brawler=abc")).status, 400);
});

test("club con miembros, mensaje propio si no existe, y lista de brawlers", async () => {
  const ok = await get("/brawlstars/club/%232clq");
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.club.members.length, 1);
  assert.strictEqual(ok.body.war, null);   // Brawl Stars no tiene guerra
  const missing = await get("/brawlstars/club/2222");
  assert.strictEqual(missing.status, 404);
  assert.match(missing.body.error, /Club no encontrado/);
  assert.deepStrictEqual((await get("/brawlstars/brawlers")).body, { items: [{ id: 16000000, name: "SHELLY" }] });
});

test("eventos de Brawl Stars con su modo y mapa", async () => {
  const { body } = await get("/brawlstars/events");
  assert.deepStrictEqual(body.items[0].event, { id: 15000026, mode: "gemGrab", map: "Hard Rock Mine", modifiers: [] });
  assert.strictEqual(body.items[0].slotId, 1);
});

test("un tag inválido responde 400 sin llamar a Supercell", async () => {
  const before = seen.length;
  const r = await get("/brawlstars/player/xx");
  assert.strictEqual(r.status, 400);
  assert.strictEqual(seen.length, before);
});

test("sin key el juego responde NOT_CONFIGURED y no aparece disponible", async () => {
  const r = await get("/clashofclans/player/2PP0");
  assert.strictEqual(r.status, 503);
  assert.strictEqual(r.body.code, "NOT_CONFIGURED");
  const games = require("../lib/access").games();
  assert.strictEqual(games.clashofclans, false);
  assert.strictEqual(games.brawlstars, true);
});

test("/top devuelve { items } con el límite pedido", async () => {
  const r = await get("/brawlstars/top?limit=3");
  assert.deepStrictEqual(r.body, { items: [{ tag: "#2PP", name: "Top" }] });
  assert.ok(seen.some(s => s.url === "/v1/rankings/global/players?limit=3"));
});

test("Clash of Clans no tiene ruta de batallas", async () => {
  const r = await fetch(`${base}/clashofclans/battles/2PP0`);
  assert.strictEqual(r.status, 404);
});
