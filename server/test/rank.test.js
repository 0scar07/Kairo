const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const rank = require("../lib/rank");
const { RankTracker } = require("../lib/rankTracker");
const { JsonStore } = require("../lib/store");
const { DEFAULT_SETTINGS } = require("../lib/devices");
const storeRef = require("../lib/storeRef");
const { errorHandler } = require("../lib/riot");

const HOUR = 3_600_000, DAY = 24 * HOUR;
const puuid = n => String(n).repeat(78);
const silent = { warn() {}, error() {}, log() {} };
const entry = (tier, rk, lp, wins, losses, extra = {}) => ({ queueType: "RANKED_SOLO_5x5", tier, rank: rk, leaguePoints: lp, wins, losses, ...extra });

// ---------- Cálculos puros ----------
test("puntuación continua: 400 por nivel, 100 por división y el LP encima; desde Maestro solo LP", () => {
  const s = (tier, rk, lp) => rank.scoreOf({ tier, rank: rk, lp });
  assert.strictEqual(s("IRON", "IV", 0), 0);
  assert.strictEqual(s("GOLD", "IV", 0), 1200);
  assert.strictEqual(s("GOLD", "II", 45), 1200 + 200 + 45);
  assert.strictEqual(s("DIAMOND", "I", 99), 2799);
  assert.strictEqual(s("MASTER", "I", 0), 2800);
  assert.strictEqual(s("CHALLENGER", "I", 640), 3440);
  assert.strictEqual(s("XX", "I", 0), null);
});

test("cambios de rango: sube, baja, entra en promoción; el LP dentro de la misma división no cuenta", () => {
  const snap = (...a) => rank.snapshotFromEntries([entry(...a)]);
  assert.deepStrictEqual(rank.rankChange(snap("GOLD", "II", 90, 10, 10), snap("GOLD", "I", 5, 11, 10)), { kind: "up", tier: "GOLD", rank: "I" });
  assert.deepStrictEqual(rank.rankChange(snap("GOLD", "IV", 3, 10, 10), snap("SILVER", "I", 75, 10, 11)), { kind: "down", tier: "SILVER", rank: "I" });
  assert.deepStrictEqual(rank.rankChange(snap("GOLD", "I", 99, 10, 10), rank.snapshotFromEntries([entry("GOLD", "I", 100, 11, 10, { miniSeries: { progress: "N" } })])), { kind: "promo", tier: "GOLD", rank: "I" });
  assert.strictEqual(rank.rankChange(snap("GOLD", "II", 10, 1, 1), snap("GOLD", "II", 60, 2, 1)), null);
  assert.strictEqual(rank.rankChange(null, snap("GOLD", "II", 10, 1, 1)), null);
  assert.strictEqual(rank.rankChange(snap("DIAMOND", "I", 90, 1, 1), snap("MASTER", "I", 5, 2, 1)).kind, "up");
});

test("resumen: partidas, victorias y LP ganados o perdidos entre dos fotos", () => {
  const a = rank.snapshotFromEntries([entry("GOLD", "II", 10, 100, 90)]);
  const b = rank.snapshotFromEntries([entry("GOLD", "I", 25, 107, 95)]);
  assert.deepStrictEqual(rank.summarize(a, b), { games: 12, wins: 7, winrate: 58, lp: 115 });
  assert.strictEqual(rank.summarize(a, a), null, "sin partidas no hay resumen");
  assert.strictEqual(rank.summarize({ solo: null }, b), null);
});

test("semana ISO y ventana del domingo 18:00-22:00 en hora local", () => {
  const sunday19Bogota = Date.UTC(2026, 8, 27, 19 + 5, 0);     // domingo 27/9/2026 19:00 en Bogotá (UTC-5)
  assert.strictEqual(rank.isWeeklyWindow(sunday19Bogota, -300), true);
  assert.strictEqual(rank.isWeeklyWindow(sunday19Bogota, 0), false, "en UTC ya es lunes 00:00");
  assert.strictEqual(rank.isWeeklyWindow(Date.UTC(2026, 8, 27, 16 + 5, 59), -300), false, "16:59 es antes de la ventana");
  assert.strictEqual(rank.isWeeklyWindow(Date.UTC(2026, 8, 27, 22 + 5, 0), -300), false, "22:00 ya la cerró");
  assert.strictEqual(rank.isoWeek(Date.UTC(2026, 8, 27, 12), 0), "2026-W39");
  assert.strictEqual(rank.isoWeek(Date.UTC(2026, 8, 28, 12), 0), "2026-W40");
});

// ---------- Rastreador ----------
async function setup(devices = []) {
  const store = new JsonStore({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kairo-rank-")), "d.json"), flushMs: 1 });
  await store.init();
  for (const d of devices) await store.put(d);
  const clock = { t: Date.UTC(2026, 8, 20, 12, 0) };   // domingo 20/9/2026
  const world = { entries: {}, calls: [], fail: {} };
  const riot = {
    async ranked(region, id) {
      world.calls.push(id);
      if (world.fail[id]) throw Object.assign(new Error("x"), { code: world.fail[id] });
      return world.entries[id] || [];
    },
  };
  const sent = [];
  const push = { async send(m) { sent.push(...m); return m.map(() => ({ ok: true, id: "t" })); } };
  const tracker = new RankTracker({ store, push, riot, now: () => clock.t, log: silent });
  return { store, clock, world, sent, tracker };
}
const device = (id, favs, settings = {}) => ({
  id, pushToken: `ExponentPushToken[${id.padEnd(12, "x")}]`, secretHash: "h", platform: "android", createdAt: "x",
  favorites: favs.map(f => ({ region: "la1", riotId: "Faker#KR1", muted: false, ...f })),
  settings: { ...structuredClone(DEFAULT_SETTINGS), ...settings },
});

test("guarda una foto por jugador y respeta los intervalos (favoritos cada 6 h, el resto cada 24 h)", async () => {
  const { store, clock, world, tracker } = await setup([device("d1", [{ puuid: puuid(1) }])]);
  await store.touchTrack([{ puuid: puuid(2), region: "kr" }], clock.t);     // alguien lo abrió: rastreo pasivo
  world.entries[puuid(1)] = [entry("GOLD", "II", 10, 5, 5)];
  world.entries[puuid(2)] = [entry("PLATINUM", "IV", 0, 1, 1)];

  await tracker.tick();
  assert.strictEqual(world.calls.length, 2);
  assert.strictEqual((await store.latestRank(puuid(1))).solo.tier, "GOLD");

  clock.t += 3 * HOUR; await tracker.tick();
  assert.strictEqual(world.calls.length, 2, "aún no toca");
  clock.t += 4 * HOUR; await tracker.tick();                                  // 7 h: toca el favorito, no el pasivo
  assert.deepStrictEqual(world.calls.slice(2), [puuid(1)]);
  clock.t += 20 * HOUR; await tracker.tick();                                 // 27 h: toca el pasivo
  assert.ok(world.calls.includes(puuid(2)) && world.calls.length >= 4);
});

test("un jugador que nadie abre desde hace 30 días deja de rastrearse", async () => {
  const { store, clock, world, tracker } = await setup();
  await store.touchTrack([{ puuid: puuid(3), region: "kr" }], clock.t - 31 * DAY);
  await tracker.tick();
  assert.strictEqual(world.calls.length, 0);
});

test("avisa una sola vez cuando un favorito sube de rango, y respeta rankAlerts y el horario silencioso", async () => {
  const { store, clock, world, sent, tracker } = await setup([
    device("si", [{ puuid: puuid(1) }]),
    device("no", [{ puuid: puuid(1) }], { rankAlerts: false }),
    device("off", [{ puuid: puuid(1) }], { enabled: false }),
  ]);
  world.entries[puuid(1)] = [entry("GOLD", "I", 80, 10, 10)];
  await tracker.tick();
  assert.strictEqual(sent.length, 0, "la primera foto no es un cambio");

  world.entries[puuid(1)] = [entry("PLATINUM", "IV", 5, 11, 10)];
  clock.t += 7 * HOUR; await tracker.tick();
  assert.strictEqual(sent.length, 1);
  assert.match(sent[0].to, /si/);
  assert.strictEqual(sent[0].title, "Faker subió de rango");
  assert.strictEqual(sent[0].body, "Ahora es Platino IV");
  assert.strictEqual(sent[0].channelId, "progress");
  assert.strictEqual(sent[0].data.type, "rank_change");

  clock.t += 7 * HOUR; await tracker.tick();
  assert.strictEqual(sent.length, 1, "no se repite mientras no vuelva a cambiar");
});

test("un error de Riot: los puntuales se saltan; la key inválida o el límite detienen la tanda", async () => {
  const { world, tracker, store } = await setup([device("d1", [{ puuid: puuid(1) }, { puuid: puuid(2) }])]);
  world.fail[puuid(1)] = "UPSTREAM_ERROR";
  await tracker.tick();
  assert.strictEqual(world.calls.length, 2, "siguió con el otro jugador");
  assert.strictEqual(await store.latestRank(puuid(1)), null);

  world.fail[puuid(1)] = "KEY_INVALID";
  tracker.last.clear();
  await assert.rejects(() => tracker.tick(), e => e.code === "KEY_INVALID");
});

test("resumen semanal: el domingo por la tarde, una vez por semana, con el favorito que más cambió", async () => {
  const off = -300;   // Bogotá
  const { store, clock, world, sent, tracker } = await setup([
    device("d1", [{ puuid: puuid(1), riotId: "Faker#KR1" }, { puuid: puuid(2), riotId: "Otro#1" }], { quiet: { enabled: false, from: "23:00", to: "07:00", utcOffsetMinutes: off } }),
    device("d2", [{ puuid: puuid(1) }], { weekly: false, quiet: { enabled: false, from: "23:00", to: "07:00", utcOffsetMinutes: off } }),
  ]);
  const seed = async (id, day, e) => store.putRank({ puuid: puuid(id), day, at: Date.parse(day + "T12:00:00Z"), region: "la1", ...rank.snapshotFromEntries([e]) });
  await seed(1, "2026-09-21", entry("GOLD", "II", 10, 100, 90));
  await seed(1, "2026-09-27", entry("GOLD", "I", 25, 107, 95));
  await seed(2, "2026-09-21", entry("SILVER", "I", 0, 50, 50));
  await seed(2, "2026-09-27", entry("SILVER", "I", 10, 51, 50));

  world.entries[puuid(1)] = [entry("GOLD", "I", 25, 107, 95)];      // lo que Riot responde hoy (igual que la última foto guardada)
  world.entries[puuid(2)] = [entry("SILVER", "I", 10, 51, 50)];
  clock.t = Date.UTC(2026, 8, 27, 12 + 5, 0);         // domingo 27 12:00 Bogotá: fuera de ventana
  await tracker.tick();
  assert.strictEqual(sent.length, 0);

  clock.t = Date.UTC(2026, 8, 27, 19 + 5, 0);         // domingo 19:00 Bogotá
  await tracker.tick();
  assert.strictEqual(sent.length, 1, "solo el dispositivo con el resumen activado");
  assert.strictEqual(sent[0].title, "Resumen semanal");
  assert.strictEqual(sent[0].body, "Faker: +115 LP · 12 partidas · 58 % victorias (+1 más)");
  assert.strictEqual(sent[0].data.type, "weekly");

  clock.t += 30 * 60_000; await tracker.tick();
  assert.strictEqual(sent.length, 1, "no se repite la misma semana");
  assert.strictEqual((await store.get("d1")).weeklySent, "2026-W39");
});

// ---------- Rutas de historial ----------
test("GET /lol/history devuelve las fotos y rastrea al jugador; POST /lol/history/touch valida", async () => {
  const store = new JsonStore({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kairo-hist-")), "d.json"), flushMs: 1 });
  await store.init();
  const id = puuid(7);
  await store.putRank({ puuid: id, day: rank.dayKey(Date.now() - 2 * DAY), region: "la1", at: 1, solo: { tier: "GOLD", rank: "II", lp: 10, wins: 1, losses: 1, score: 1310 }, flex: null });
  storeRef.set(store);
  const app = express();
  app.use(express.json());
  app.use("/lol", require("../routes/lol"));
  app.use(errorHandler);
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}/lol`;
    const h = await (await fetch(`${base}/history/${id}?region=la1`)).json();
    assert.strictEqual(h.snapshots.length, 1);
    assert.strictEqual(h.snapshots[0].solo.score, 1310);
    assert.ok(!("puuid" in h.snapshots[0]), "no repite el puuid en cada foto");
    assert.strictEqual((await store.listTrack(0)).length, 1, "pedir el historial lo rastrea");

    const touch = await (await fetch(`${base}/history/touch`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ puuid: puuid(8), region: "kr" }, { puuid: "corto", region: "kr" }, { puuid: puuid(9), region: "marte" }] }) })).json();
    assert.strictEqual(touch.count, 1, "solo entra el válido");
    assert.strictEqual((await fetch(`${base}/history/${id}?region=marte`)).status, 400);
  } finally { server.close(); storeRef.set(null); await store.close(); }
});
