const test = require("node:test");
const assert = require("node:assert");
const { addMatch, emptyAggregate, championSummary, metaSummary, patchOf } = require("../lib/builds");
const { BuildsJob } = require("../lib/buildsJob");

const part = (championId, win, extra = {}) => ({
  championId, win, teamPosition: "MIDDLE", item0: 3089, item1: 3020, item2: 0, item3: 4645, item4: 0, item5: 0,
  summoner1Id: 14, summoner2Id: 4,
  perks: { styles: [{ style: 8100, selections: [{ perk: 8112 }, { perk: 8139 }, { perk: 8138 }, { perk: 8135 }] }, { style: 8300, selections: [{ perk: 8345 }, { perk: 8347 }] }] },
  ...extra,
});
const match = (version, participants, extra = {}) => ({ info: { queueId: 420, gameDuration: 1800, gameVersion: version, participants, ...extra } });

test("addMatch suma objetos, runas, hechizos y posición por campeón y parche", () => {
  const agg = emptyAggregate();
  assert.strictEqual(addMatch(agg, match("16.20.1.1", [part(103, true), part(103, false, { item0: 6655 })])), true);
  const c = agg.patches["16.20"].champs[103];
  assert.strictEqual(c.games, 2);
  assert.deepStrictEqual(c.items["3089"], [1, 1]);
  assert.deepStrictEqual(c.items["3020"], [2, 1]);
  assert.deepStrictEqual(c.spells["4-14"], [2, 1]);
  assert.deepStrictEqual(c.keystones["8112"], [2, 1]);
});

test("addMatch ignora otras colas, partidas cortas y rendiciones tempranas", () => {
  const agg = emptyAggregate();
  assert.strictEqual(addMatch(agg, match("16.20.1", [part(1, true)], { queueId: 440 })), false);
  assert.strictEqual(addMatch(agg, match("16.20.1", [part(1, true)], { gameDuration: 600 })), false);
  addMatch(agg, match("16.20.1", [part(1, true, { gameEndedInEarlySurrender: true }), part(2, true)]));
  assert.strictEqual(agg.patches["16.20"].champs[1], undefined);
});

test("solo se guardan los 2 parches más recientes y el resumen usa el más nuevo con datos", () => {
  const agg = emptyAggregate();
  addMatch(agg, match("16.9.1", [part(5, true)]));
  addMatch(agg, match("16.10.1", [part(5, true)]));
  addMatch(agg, match("16.20.1", [part(6, true)]));
  assert.deepStrictEqual(Object.keys(agg.patches).sort(), ["16.10", "16.20"]);
  const s = championSummary(agg, 5, 1);
  assert.strictEqual(s.patch, "16.10");          // en 16.20 no hay partidas de ese campeón
  assert.deepStrictEqual(s.pages[0].primary, [8112, 8139, 8138, 8135]);
  assert.strictEqual(championSummary(agg, 999), null);
  assert.strictEqual(metaSummary(agg).patch, "16.20");
  assert.strictEqual(patchOf("16.20.712.3"), "16.20");
});

test("BuildsJob toma partidas nuevas de Challenger y no repite las ya vistas", async () => {
  const kv = new Map();
  const store = { getKV: async k => kv.get(k) || null, putKV: async (k, v) => { kv.set(k, JSON.parse(JSON.stringify(v))); } };
  const calls = [];
  const get = async url => {
    calls.push(url);
    if (url.includes("challengerleagues")) return { entries: [{ puuid: "a".repeat(30), leaguePoints: 900 }, { puuid: "b".repeat(30), leaguePoints: 800 }] };
    if (url.includes("/ids?")) return ["KR_1", "KR_2"];
    return match("16.20.1", [part(103, true), part(55, false)]);
  };
  const job = new BuildsJob({ store, get, regions: ["kr"], playersPerRun: 2, log: { warn() {} } });
  assert.strictEqual((await job.tick()).added, 2);   // KR_1 y KR_2 (repetidas entre jugadores, se cuentan una vez)
  assert.strictEqual((await job.tick()).added, 0);   // ya vistas
  assert.strictEqual(kv.get("builds:v1").patches["16.20"].champs[103].games, 2);
});
