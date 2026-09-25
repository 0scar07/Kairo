const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { JsonStore } = require("../lib/store");
const { TrophyTracker, recordOf } = require("../lib/trophyTracker");
const { parseFavorites, DEFAULT_SETTINGS } = require("../lib/devices");
const { Watcher } = require("../lib/watcher");

const HOUR = 3_600_000;
const silent = { warn() {}, error() {}, log() {} };
const PUUID = "a".repeat(78);

test("favoritos de Supercell: llevan su juego, el tag va como identificador y no tienen región", () => {
  const out = parseFavorites([
    { game: "brawlstars", puuid: "8QL9UPCLP", riotId: "Osky#8QL9UPCLP", muted: false },
    { game: "clashroyale", puuid: "2PP0", region: "kr" },
    { puuid: PUUID, region: "la1", riotId: "Faker#KR1" },                 // LoL: sin campo game, como siempre
    { game: "brawlstars", puuid: "8QL9UPCLP" },                            // duplicado
    { game: "clashroyale", puuid: "2PP0" },                                // mismo tag en OTRO juego sí cuenta aparte
  ]);
  assert.deepStrictEqual(out.map(f => [f.game || "lol", f.puuid, f.region]), [
    ["brawlstars", "8QL9UPCLP", "global"], ["clashroyale", "2PP0", "global"], ["lol", PUUID, "la1"],
  ]);
  for (const bad of [[{ game: "fortnite", puuid: "2PP0" }], [{ game: "brawlstars", puuid: "zzzz" }], [{ game: "brawlstars", puuid: PUUID }]]) {
    assert.throws(() => parseFavorites(bad), e => e.status === 400 && e.code === "INVALID_FAVORITES");
  }
});

test("el récord de trofeos es la mejor marca que reporta el juego", () => {
  assert.strictEqual(recordOf({ trophies: 500, highestTrophies: 900 }), 900);
  assert.strictEqual(recordOf({ trophies: 6000, bestTrophies: 6900 }), 6900);
  assert.strictEqual(recordOf({ trophies: 300 }), 300);
});

async function setup(devices) {
  const store = new JsonStore({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kairo-tro-")), "d.json"), flushMs: 1 });
  await store.init();
  for (const d of devices) await store.put(d);
  const clock = { t: Date.UTC(2026, 8, 20, 15, 0) };
  const world = { players: {}, calls: [] };
  const api = { async player(game, tag) { world.calls.push(`${game}:${tag}`); if (!world.players[tag]) throw Object.assign(new Error("x"), { code: "TAG_NOT_FOUND" }); return world.players[tag]; } };
  const sent = [];
  const push = { async send(m) { sent.push(...m); return m.map(() => ({ ok: true, id: "t" })); } };
  const tracker = new TrophyTracker({ store, push, api, now: () => clock.t, log: silent, configured: () => true });
  return { store, clock, world, sent, tracker };
}
const device = (id, favs, settings = {}) => ({
  id, pushToken: `ExponentPushToken[${id.padEnd(12, "x")}]`, secretHash: "h", platform: "android", createdAt: "x",
  favorites: favs, settings: { ...structuredClone(DEFAULT_SETTINGS), ...settings },
});
const bs = (tag, extra = {}) => ({ game: "brawlstars", puuid: tag, region: "global", riotId: `Osky#${tag}`, muted: false, ...extra });

test("avisa una sola vez cuando un favorito bate su récord; la primera lectura solo guarda la marca", async () => {
  const { world, sent, clock, tracker } = await setup([device("d1", [bs("8QL9UPCLP")])]);
  world.players["8QL9UPCLP"] = { name: "Osky", trophies: 20000, highestTrophies: 21000 };
  await tracker.tick();
  assert.strictEqual(sent.length, 0, "no avisa de lo que ya tenía");

  clock.t += 3 * HOUR; await tracker.tick();
  assert.strictEqual(world.calls.length, 1, "aún no toca (cada 6 h)");

  world.players["8QL9UPCLP"] = { name: "Osky", trophies: 21150, highestTrophies: 21150 };
  clock.t += 4 * HOUR; await tracker.tick();
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].title, "Osky: nuevo récord de trofeos");
  assert.strictEqual(sent[0].body, "21150 trofeos (+150)");
  assert.strictEqual(sent[0].channelId, "progress");
  assert.deepStrictEqual([sent[0].data.type, sent[0].data.game, sent[0].data.puuid], ["trophy_record", "brawlstars", "8QL9UPCLP"]);

  clock.t += 7 * HOUR; await tracker.tick();
  assert.strictEqual(sent.length, 1, "sin nuevo récord no se repite");
  world.players["8QL9UPCLP"] = { name: "Osky", trophies: 20500, highestTrophies: 21150 };   // bajó: no es récord
  clock.t += 7 * HOUR; await tracker.tick();
  assert.strictEqual(sent.length, 1);
});

test("respeta trophyAlerts, silenciados y dispositivos apagados; un jugador seguido por varios se consulta una vez", async () => {
  const { world, sent, clock, tracker } = await setup([
    device("si", [bs("2PP0")]), device("otro", [bs("2PP0")]),
    device("no", [bs("2PP0")], { trophyAlerts: false }),
    device("off", [bs("2PP0")], { enabled: false }),
    device("muted", [bs("2PP0", { muted: true })]),
    device("lol", [{ puuid: PUUID, region: "la1", riotId: "F#1", muted: false }]),
  ]);
  world.players["2PP0"] = { name: "Uno", trophies: 100, highestTrophies: 100 };
  await tracker.tick();
  assert.deepStrictEqual(world.calls, ["brawlstars:2PP0"], "una sola consulta");
  world.players["2PP0"] = { name: "Uno", trophies: 130, highestTrophies: 130 };
  clock.t += 7 * HOUR; await tracker.tick();
  assert.deepStrictEqual(sent.map(m => m.to.slice(-24)).sort(), ["ExponentPushToken[otroxxxxxxxx]".slice(-24), "ExponentPushToken[sixxxxxxxxxx]".slice(-24)].sort());
});

test("un jugador que falla no frena a los demás, y sin la key del juego no se consulta", async () => {
  const { world, tracker } = await setup([device("d1", [bs("8QL9UPCLP"), bs("2PP0")])]);
  world.players["2PP0"] = { name: "Uno", trophies: 1, highestTrophies: 1 };
  await tracker.tick();
  assert.strictEqual(world.calls.length, 2, "el que falla (8QL9UPCLP no existe en el mundo de prueba) no impidió leer al otro");

  const sin = await setup([device("d1", [bs("2PP0")])]);
  sin.tracker.configured = () => false;
  await sin.tracker.tick();
  assert.strictEqual(sin.world.calls.length, 0);
});

test("el vigilante de LoL y el historial ignoran los favoritos de Supercell", async () => {
  const dev = device("d1", [bs("2PP0"), { puuid: PUUID, region: "la1", riotId: "Faker#KR1", muted: false }]);
  const watcher = new Watcher({ store: { list: async () => [] }, push: {}, log: silent });
  const targets = watcher.targets([dev]);
  assert.deepStrictEqual([...targets.keys()], [PUUID]);
});
