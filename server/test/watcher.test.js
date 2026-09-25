const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { JsonStore } = require("../lib/store");
const { Watcher, isQuiet, RESULT_DELAYS_MS } = require("../lib/watcher");
const { DEFAULT_SETTINGS } = require("../lib/devices");
const { createDevicesRouter } = require("../routes/devices");
const { errorHandler } = require("../lib/riot");
const text = require("../lib/pushText");

const MIN = 60_000;
const puuid = n => String(n).repeat(78);
const silent = { warn() {}, error() {}, log() {} };

// ---------- Utilidades ----------
async function setup({ devices = [], maxPerTick = 40 } = {}) {
  const store = new JsonStore({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kairo-w-")), "d.json"), flushMs: 1 });
  await store.init();
  for (const d of devices) await store.put(d);

  const clock = { t: Date.UTC(2026, 0, 1, 12, 0, 0) };
  const world = { live: {}, match: {}, calls: { live: [], match: [] }, fail: {} };   // lo que "responde Riot"
  const riot = {
    async live(region, id) {
      world.calls.live.push(id);
      if (world.fail[id]) throw Object.assign(new Error("x"), { code: world.fail[id] });
      return world.live[id] || { inGame: false };
    },
    async match(region, id, gameId) {
      world.calls.match.push(gameId);
      return world.match[gameId] || null;
    },
  };
  const sent = [];
  const push = {
    async send(messages) { sent.push(...messages); return messages.map((m, i) => (world.pushResult?.(m, i) || { ok: true, id: `t${sent.length}-${i}` })); },
    async receipts() { return world.receipts || {}; },
  };
  const names = async id => ({ 103: "Ahri", 157: "Yasuo" }[id] ?? null);
  const art = { bannerUrl: p => (world.artBase ? `${world.artBase}/art/banner.png?k=${p.k}&n=${p.n}&c=${p.c}` : null) };
  const make = (opts = {}) => new Watcher({ store, riot, push, names, art, now: () => clock.t, log: silent, maxPerTick, ...opts });
  return { store, world, sent, clock, make, watcher: make() };
}

const device = (id, favs, settings = {}) => ({
  id, pushToken: `ExponentPushToken[${id.padEnd(12, "x")}]`, secretHash: "h", platform: "android", createdAt: "x",
  favorites: favs.map(f => ({ region: "la1", riotId: "Faker#KR1", muted: false, ...f })),
  settings: { ...structuredClone(DEFAULT_SETTINGS), ...settings },
});

const inGame = (gameId, extra = {}) => ({ inGame: true, gameId, queueId: 420, championId: 103, length: 30, ...extra });
const result = (extra = {}) => ({ win: true, championId: 103, kills: 8, deaths: 2, assists: 11, queueId: 420, remake: false, ...extra });

// ---------- Flujo principal ----------
test("avisa una vez al entrar en partida y una vez al terminar con el resultado", async () => {
  const { world, sent, clock, watcher } = await setup({ devices: [device("d1", [{ puuid: puuid(1) }])] });

  await watcher.tick();
  assert.strictEqual(sent.length, 0, "no está jugando");

  world.live[puuid(1)] = inGame(555);
  clock.t += 2 * MIN;
  await watcher.tick();
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].title, "Faker está en partida");
  assert.strictEqual(sent[0].body, "Ranked Solo/Duo · Ahri");
  assert.strictEqual(sent[0].channelId, "live_start");
  assert.ok(!("richContent" in sent[0]), "sin dirección pública no hay imagen");
  assert.strictEqual(sent[0].data.type, "live_start");
  assert.strictEqual(sent[0].data.gameId, 555);
  assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(sent[0].title + sent[0].body), "sin emojis");

  clock.t += 2 * MIN;
  await watcher.tick();
  assert.strictEqual(sent.length, 1, "la misma partida no se vuelve a avisar");

  world.live[puuid(1)] = { inGame: false };          // terminó
  clock.t += 2 * MIN;
  await watcher.tick();
  assert.strictEqual(sent.length, 1, "todavía no hay resultado");

  clock.t += 3 * MIN;                                 // primer reintento: la partida aún no aparece en match-v5
  await watcher.tick();
  assert.strictEqual(sent.length, 1);

  world.match[555] = result();
  clock.t += 5 * MIN;
  await watcher.tick();
  assert.strictEqual(sent.length, 2);
  assert.strictEqual(sent[1].title, "Faker ganó con Ahri");
  assert.strictEqual(sent[1].body, "8/2/11 · Ranked Solo/Duo");
  assert.strictEqual(sent[1].data.type, "live_end");
  assert.strictEqual(sent[1].channelId, "live_result", "el resultado suena distinto");

  for (let i = 0; i < 5; i++) { clock.t += 5 * MIN; await watcher.tick(); }
  assert.strictEqual(sent.length, 2, "nada más se repite");
});

test("un reinicio del servidor no repite avisos (el estado vive en el almacén)", async () => {
  const { world, sent, clock, make } = await setup({ devices: [device("d1", [{ puuid: puuid(1) }])] });
  world.live[puuid(1)] = inGame(9);
  await make().tick();
  assert.strictEqual(sent.length, 1);

  clock.t += 2 * MIN;
  await make().tick();                                // "reinicio": otro vigilante con el mismo almacén
  assert.strictEqual(sent.length, 1);

  world.live[puuid(1)] = { inGame: false };
  world.match[9] = result({ win: false });
  clock.t += 2 * MIN; await make().tick();
  clock.t += 3 * MIN; await make().tick();
  assert.strictEqual(sent.length, 2);
  assert.strictEqual(sent[1].title, "Faker perdió con Ahri");
  clock.t += 30 * MIN; await make().tick();
  assert.strictEqual(sent.length, 2);
});

test("dos partidas seguidas entre revisiones se avisan por separado", async () => {
  const { world, sent, clock, watcher } = await setup({ devices: [device("d1", [{ puuid: puuid(1) }])] });
  world.live[puuid(1)] = inGame(1);
  await watcher.tick();
  world.live[puuid(1)] = inGame(2);                   // la 1 terminó y empezó la 2 sin que lo viéramos
  clock.t += 2 * MIN; await watcher.tick();
  assert.deepStrictEqual(sent.map(m => m.data.gameId), [1, 2]);
  world.match[1] = result();
  clock.t += 3 * MIN; await watcher.tick();
  assert.deepStrictEqual(sent.map(m => m.data.type), ["live_start", "live_start", "live_end"]);
  assert.strictEqual(sent[2].data.gameId, 1);
});

test("una partida repetida (remake) no genera aviso de resultado y el vigilante se rinde tras los reintentos", async () => {
  const { world, sent, clock, watcher, store } = await setup({ devices: [device("d1", [{ puuid: puuid(1) }, { puuid: puuid(2) }])] });
  world.live[puuid(1)] = inGame(10);
  world.live[puuid(2)] = inGame(20);
  await watcher.tick();
  world.live[puuid(1)] = { inGame: false }; world.live[puuid(2)] = { inGame: false };
  world.match[10] = result({ remake: true });         // el 20 nunca aparece
  clock.t += 2 * MIN; await watcher.tick();
  for (let i = 0; i < RESULT_DELAYS_MS.length + 2; i++) { clock.t += 6 * MIN; await watcher.tick(); }
  assert.deepStrictEqual(sent.map(m => m.data.type), ["live_start", "live_start"]);
  const state = (await store.listWatch()).find(w => w.puuid === puuid(2));
  assert.deepStrictEqual(state.pending, [], "dejó de reintentar");
});

// ---------- Quién recibe qué ----------
test("respeta silenciados, interruptores, avisos de inicio/fin e idioma", async () => {
  const { world, sent, clock, watcher } = await setup({
    devices: [
      device("mute", [{ puuid: puuid(1), muted: true }]),
      device("off", [{ puuid: puuid(1) }], { enabled: false }),
      device("noStart", [{ puuid: puuid(1) }], { notifyStart: false }),
      device("noEnd", [{ puuid: puuid(1) }], { notifyEnd: false }),
      device("english", [{ puuid: puuid(1) }], { locale: "en", notifyEnd: false, notifyStart: true }),
    ],
  });
  world.live[puuid(1)] = inGame(7);
  await watcher.tick();
  const who = sent.map(m => m.to).sort();
  assert.deepStrictEqual(who, [`ExponentPushToken[${"noEnd".padEnd(12, "x")}]`, `ExponentPushToken[${"english".padEnd(12, "x")}]`].sort());
  assert.strictEqual(sent.find(m => m.title.includes("is in a game")).body, "Ranked Solo/Duo · Ahri");

  world.live[puuid(1)] = { inGame: false }; world.match[7] = result();
  clock.t += 2 * MIN; await watcher.tick();
  clock.t += 3 * MIN; await watcher.tick();
  const ends = sent.filter(m => m.data.type === "live_end").map(m => m.to);
  assert.deepStrictEqual(ends, [`ExponentPushToken[${"noStart".padEnd(12, "x")}]`], "solo quien quiere el resultado");
});

test("horario silencioso: no avisa dentro del rango, incluso si cruza la medianoche", async () => {
  const quiet = { quiet: { enabled: true, from: "23:00", to: "07:00", utcOffsetMinutes: -300 } };   // Bogotá
  assert.strictEqual(isQuiet({ quiet: { ...quiet.quiet, enabled: false } }, Date.now()), false);
  // 12:00 UTC = 07:00 Bogotá -> ya terminó el silencio; 11:59 UTC = 06:59 -> silencio
  assert.strictEqual(isQuiet(quiet, Date.UTC(2026, 0, 1, 12, 0)), false);
  assert.strictEqual(isQuiet(quiet, Date.UTC(2026, 0, 1, 11, 59)), true);
  assert.strictEqual(isQuiet(quiet, Date.UTC(2026, 0, 1, 4, 0)), true);     // 23:00 Bogotá
  assert.strictEqual(isQuiet(quiet, Date.UTC(2026, 0, 1, 3, 59)), false);   // 22:59
  assert.strictEqual(isQuiet({ quiet: { enabled: true, from: "13:00", to: "15:00", utcOffsetMinutes: 0 } }, Date.UTC(2026, 0, 1, 14, 0)), true);

  const { world, sent, watcher, clock } = await setup({ devices: [device("d1", [{ puuid: puuid(1) }], quiet)] });
  clock.t = Date.UTC(2026, 0, 1, 8, 0);               // 03:00 Bogotá
  world.live[puuid(1)] = inGame(3);
  await watcher.tick();
  assert.strictEqual(sent.length, 0);
});

// ---------- Presupuesto y eficiencia ----------
test("un jugador seguido por varios dispositivos se consulta una sola vez y todos reciben el aviso", async () => {
  const { world, sent, watcher } = await setup({ devices: [device("a", [{ puuid: puuid(1) }]), device("b", [{ puuid: puuid(1) }]), device("c", [{ puuid: puuid(1) }])] });
  world.live[puuid(1)] = inGame(4);
  await watcher.tick();
  assert.strictEqual(world.calls.live.length, 1);
  assert.strictEqual(sent.length, 3);
});

test("presupuesto por tanda: rota entre los jugadores para cubrirlos a todos", async () => {
  const favs = [1, 2, 3, 4, 5].map(n => ({ puuid: puuid(n) }));
  const { world, watcher, clock } = await setup({ devices: [device("a", favs)], maxPerTick: 2 });
  for (let i = 0; i < 3; i++) { clock.t += 2 * MIN; await watcher.tick(); }
  assert.strictEqual(world.calls.live.length, 6);
  assert.strictEqual(new Set(world.calls.live).size, 5, "los 5 se revisaron sin repetir hasta cubrirlos");
});

test("olvida el estado de jugadores que nadie vigila ya", async () => {
  const dev = device("a", [{ puuid: puuid(1) }]);
  const { world, watcher, store } = await setup({ devices: [dev] });
  world.live[puuid(1)] = inGame(1);
  await watcher.tick();
  assert.strictEqual((await store.listWatch()).length, 1);
  await store.put({ ...dev, favorites: [] });
  await watcher.tick();
  assert.strictEqual((await store.listWatch()).length, 0);
});

// ---------- Errores ----------
test("la key inválida o el límite de Riot detienen la tanda; otros errores solo saltan a ese jugador", async () => {
  const { world, watcher } = await setup({ devices: [device("a", [1, 2, 3].map(n => ({ puuid: puuid(n) })))] });
  world.fail[puuid(1)] = "KEY_INVALID";
  await watcher.tick();
  assert.strictEqual(world.calls.live.length, 1, "no siguió con los demás");

  world.fail[puuid(1)] = "UPSTREAM_ERROR";
  world.calls.live.length = 0;
  await watcher.tick();
  assert.strictEqual(world.calls.live.length, 3, "un error normal solo afecta a un jugador");
});

test("tokens muertos: DeviceNotRegistered en el envío o en el recibo da de baja el dispositivo", async () => {
  const { world, watcher, store, clock } = await setup({ devices: [device("dead", [{ puuid: puuid(1) }]), device("late", [{ puuid: puuid(1) }])] });
  world.pushResult = (m, i) => (m.to.includes("dead") ? { ok: false, error: "DeviceNotRegistered" } : { ok: true, id: "recibo-late" });
  world.live[puuid(1)] = inGame(1);
  await watcher.tick();
  assert.strictEqual(await store.get("dead"), null, "baja inmediata");
  assert.ok(await store.get("late"));

  world.receipts = { "recibo-late": { status: "error", details: { error: "DeviceNotRegistered" } } };
  clock.t += 16 * MIN;
  await watcher.tick();
  assert.strictEqual(await store.get("late"), null, "baja por recibo");
});

// ---------- Cliente de Expo Push ----------
test("cliente de Expo Push: envía en tandas de 100, en orden, y lee recibos", async () => {
  const batches = [];
  const expo = http.createServer((req, res) => {
    let body = ""; req.on("data", c => (body += c));
    req.on("end", () => {
      const data = JSON.parse(body);
      res.setHeader("Content-Type", "application/json");
      if (req.url.endsWith("/push/send")) {
        batches.push(data.length);
        return res.end(JSON.stringify({ data: data.map((m, i) => (m.to.endsWith("bad]") ? { status: "error", message: "x", details: { error: "DeviceNotRegistered" } } : { status: "ok", id: `id-${m.to}` })) }));
      }
      res.end(JSON.stringify({ data: { [data.ids[0]]: { status: "ok" } } }));
    });
  });
  await new Promise(r => expo.listen(0, r));
  process.env.EXPO_PUSH_BASE = `http://127.0.0.1:${expo.address().port}/v2`;
  try {
    delete require.cache[require.resolve("../lib/push")];
    const push = require("../lib/push");
    const messages = Array.from({ length: 205 }, (_, i) => ({ to: i === 150 ? "ExponentPushToken[bad]" : `ExponentPushToken[t${i}]`, title: "x" }));
    const out = await push.send(messages);
    assert.deepStrictEqual(batches, [100, 100, 5]);
    assert.strictEqual(out.length, 205);
    assert.deepStrictEqual(out[150], { ok: false, error: "DeviceNotRegistered" });
    assert.deepStrictEqual(out[0], { ok: true, id: "id-ExponentPushToken[t0]" });
    assert.deepStrictEqual(await push.receipts(["r1"]), { r1: { status: "ok" } });
  } finally { expo.close(); delete process.env.EXPO_PUSH_BASE; }
});

test("cliente de Expo Push: si Expo cae, devuelve fallos en vez de lanzar", async () => {
  process.env.EXPO_PUSH_BASE = "http://127.0.0.1:9";
  try {
    delete require.cache[require.resolve("../lib/push")];
    const out = await require("../lib/push").send([{ to: "ExponentPushToken[abcdefghijkl]", title: "x" }]);
    assert.deepStrictEqual(out, [{ ok: false, error: "SEND_FAILED" }]);
  } finally { delete process.env.EXPO_PUSH_BASE; }
});

// ---------- Textos ----------
test("textos: los 5 idiomas producen título y cuerpo sin emojis", () => {
  for (const l of text.LOCALES) {
    const s = text.startText(l, { name: "Faker", queueId: 420, champion: "Ahri", minutes: 4 });
    const e = text.endText(l, { name: "Faker", win: false, champion: "Ahri", kills: 1, deaths: 2, assists: 3, queueId: 450 });
    for (const v of [s.title, s.body, e.title, e.body, text.testText(l).title]) {
      assert.ok(v && v.length > 3);
      assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(v));
    }
    assert.match(s.title, /Faker/);
    assert.match(s.body, /4/);
  }
  assert.strictEqual(text.startText("es", { name: "X", queueId: 999, champion: null, minutes: 0 }).body, "Partida");
  assert.strictEqual(text.endText("xx", { name: "X", win: true, champion: null, kills: 0, deaths: 0, assists: 0, queueId: 1 }).title, "X ganó su partida", "idioma desconocido -> español");
});

// ---------- Endpoint de prueba ----------
test("POST /devices/me/test manda una notificación de prueba a este dispositivo (y solo a él)", async () => {
  const store = new JsonStore({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kairo-t-")), "d.json"), flushMs: 1 });
  await store.init();
  const sent = [];
  const push = { async send(m) { sent.push(...m); return m.map(() => ({ ok: true, id: "x" })); } };
  const app = express();
  app.use(express.json());
  app.use("/devices", createDevicesRouter(store, { push, testPerHour: 3 }));
  app.use(errorHandler);
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/devices`;
    const reg = await (await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pushToken: "ExponentPushToken[pruebaprueba1234]", settings: { locale: "en" } }) })).json();
    const call = body => fetch(`${base}/me/test`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Device ${reg.deviceId}.${reg.secret}` }, body: JSON.stringify(body) });

    assert.deepStrictEqual(await (await call({})).json(), { ok: true });
    assert.strictEqual(sent[0].title, "Test notification");
    assert.strictEqual(sent[0].to, "ExponentPushToken[pruebaprueba1234]");
    await call({ type: "live_start" });
    assert.strictEqual(sent[1].title, "Kairo is in a game");
    assert.strictEqual((await call({ type: "raro" })).status, 400);
    assert.strictEqual((await call({})).status, 429, "limitado por dispositivo");
    assert.strictEqual((await fetch(`${base}/me/test`, { method: "POST" })).status, 401);

    const set = await fetch(`${base}/me/settings`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Device ${reg.deviceId}.${reg.secret}` }, body: JSON.stringify({ locale: "xx" }) });
    assert.strictEqual(set.status, 400);
  } finally { server.close(); await store.close(); }
});

// ---------- Banner firmado ----------
test("con dirección pública, cada aviso lleva su banner en richContent (inicio y resultado)", async () => {
  const { world, sent, clock, watcher } = await setup({ devices: [device("d1", [{ puuid: puuid(1) }])] });
  world.artBase = "https://api.ejemplo.com";
  world.live[puuid(1)] = inGame(70);
  await watcher.tick();
  assert.strictEqual(sent[0].richContent.image, "https://api.ejemplo.com/art/banner.png?k=start&n=Faker&c=103");
  world.live[puuid(1)] = { inGame: false }; world.match[70] = result({ win: false });
  clock.t += 2 * MIN; await watcher.tick();
  clock.t += 3 * MIN; await watcher.tick();
  assert.match(sent[1].richContent.image, /k=loss/);
});

test("banner: URL firmada, firma inválida rechazada y PNG de verdad", async () => {
  process.env.PUBLIC_BASE_URL = "https://api.ejemplo.com";
  const art = require("../lib/art");
  const url = new URL(art.bannerUrl({ k: "win", n: "Faker con un nombre larguísimo que se recorta", q: 420, c: 103, l: "en", kda: "8/2/11" }));
  assert.strictEqual(url.origin, "https://api.ejemplo.com");
  const query = Object.fromEntries(url.searchParams);
  assert.ok(art.verify(query), "la URL que generó el servidor es válida");
  assert.strictEqual(art.verify({ ...query, n: "otro" }), null, "cambiar cualquier dato invalida la firma");
  assert.strictEqual(art.verify({ ...query, sig: "0".repeat(24) }), null);
  assert.strictEqual(art.verify({ k: "win" }), null);
  delete process.env.PUBLIC_BASE_URL;
  assert.strictEqual(art.bannerUrl({ k: "start", n: "X" }), null, "sin dirección pública no hay URL");

  // la ruta sirve el PNG (sin red: Data Dragon puede fallar y el banner sale igual, con degradado)
  const app = express();
  app.use("/art", require("../routes/art"));
  app.use(errorHandler);
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/art/banner.png`;
    const ok = await fetch(`${base}?${url.searchParams.toString()}`);
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.headers.get("content-type"), "image/png");
    const bytes = Buffer.from(await ok.arrayBuffer());
    assert.deepStrictEqual([...bytes.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], "empieza con la firma de un PNG");
    const bad = await fetch(`${base}?k=win&n=Hack&sig=abc`);
    assert.strictEqual(bad.status, 403);
    assert.strictEqual((await bad.json()).code, "BAD_SIGNATURE");
  } finally { server.close(); }
});
