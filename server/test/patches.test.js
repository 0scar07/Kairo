const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { JsonStore } = require("../lib/store");
const { PatchTracker, latestPatches } = require("../lib/patchTracker");
const { parseSettings, DEFAULT_SETTINGS } = require("../lib/devices");
const { patchText } = require("../lib/pushText");

const MIN = 60_000;
const silent = { warn() {}, error() {}, log() {} };

const item = (game, id, title = "Patch 26.21 Notes", kind = "patch") => ({
  id: `${game}:${id}`, game, kind, title, image: null, url: `https://x/${id}`, article: { game, path: `/news/${id}` },
});

async function setup(devices) {
  const store = new JsonStore({ file: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kairo-patch-")), "d.json"), flushMs: 1 });
  await store.init();
  for (const d of devices) await store.put(d);
  const clock = { t: Date.UTC(2026, 9, 20, 15, 0) };
  const world = { news: { en: [], es: [] }, loads: 0 };
  const loadNews = async lang => { world.loads++; return world.news[lang] || world.news.en; };
  const sent = [];
  const push = { async send(m) { sent.push(...m); return m.map(() => ({ ok: true })); } };
  const tracker = new PatchTracker({ store, push, loadNews, now: () => clock.t, log: silent });
  return { store, clock, world, sent, tracker };
}
const device = (id, settings = {}) => ({
  id, pushToken: `ExponentPushToken[${id.padEnd(12, "x")}]`, secretHash: "h", platform: "android", createdAt: "x",
  favorites: [], settings: { ...DEFAULT_SETTINGS, ...settings },
});

test("el último parche de cada juego sale de la lista de noticias, sin noticias comunes", () => {
  const out = latestPatches([item("lol", "b"), item("lol", "a"), item("tft", "n", "Hola", "news"), item("fortnite", "z")]);
  assert.deepStrictEqual(Object.keys(out), ["lol"]);
  assert.strictEqual(out.lol.id, "lol:b");
});

test("la primera vez solo guarda lo que hay; después avisa una vez por parche nuevo", async () => {
  const { clock, world, sent, tracker, store } = await setup([device("d1"), device("d2", { patchGames: ["tft"] })]);
  world.news.en = [item("lol", "p20"), item("tft", "t20")];
  await tracker.tick();
  assert.strictEqual(sent.length, 0);
  assert.deepStrictEqual(await store.getKV("patch:seen"), { lol: "lol:p20", tft: "tft:t20" });

  world.news.en = [item("lol", "p21"), item("tft", "t20")];
  clock.t += 10 * MIN;
  await tracker.tick();
  assert.strictEqual(sent.length, 0, "antes de 30 minutos no vuelve a mirar");

  clock.t += 25 * MIN;
  await tracker.tick();
  assert.strictEqual(sent.length, 1, "solo el dispositivo que sigue LoL");
  assert.strictEqual(sent[0].data.type, "patch");
  assert.strictEqual(sent[0].data.path, "/news/p21");

  clock.t += 31 * MIN;
  await tracker.tick();
  assert.strictEqual(sent.length, 1, "el mismo parche no se repite");
});

test("respeta el interruptor, el horario silencioso y el idioma de cada dispositivo", async () => {
  const quiet = { enabled: true, from: "00:00", to: "23:59", utcOffsetMinutes: 0 };
  const { clock, world, sent, tracker } = await setup([
    device("es", { locale: "es" }), device("off", { patchAlerts: false }), device("night", { quiet }), device("all", { enabled: false }),
  ]);
  world.news.en = [item("lol", "p20")];
  await tracker.tick();
  world.news.en = [item("lol", "p21")];
  world.news.es = [item("lol", "p21-es", "Notas de la versión 26.21")];
  clock.t += 31 * MIN;
  await tracker.tick();
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].title, "Salió el parche 26.21 de LoL");
  assert.strictEqual(sent[0].data.path, "/news/p21-es");
});

test("ajustes: patchAlerts y patchGames se validan", () => {
  const s = parseSettings({ patchAlerts: false, patchGames: ["lol", "valorant", "lol"] });
  assert.strictEqual(s.patchAlerts, false);
  assert.deepStrictEqual(s.patchGames, ["lol", "valorant"]);
  for (const bad of [{ patchGames: ["minecraft"] }, { patchGames: "lol" }, { patchAlerts: "si" }]) {
    assert.throws(() => parseSettings(bad), e => e.status === 400 && e.code === "INVALID_SETTINGS");
  }
});

test("texto: con número de versión y sin él", () => {
  assert.strictEqual(patchText("en", { game: "valorant", title: "VALORANT Patch Notes 11.08" }).title, "Valorant patch 11.08 is out");
  assert.strictEqual(patchText("es", { game: "apex", title: "Apex Legends: Latest Update" }).title, "Nuevo parche de Apex Legends");
});
