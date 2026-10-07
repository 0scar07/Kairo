const test = require("node:test");
const assert = require("node:assert");
const { masterySummary } = require("../lib/insights");

const m = (championId, championPoints, championLevel = 5) => ({ championId, championPoints, championLevel, lastPlayTime: 1000 + championId });

test("masterySummary ubica al campeón jugado dentro de su maestría", () => {
  const out = masterySummary([m(1, 5000), m(222, 900_000, 40), m(3, 120_000), m(4, 0)], 3);
  assert.deepStrictEqual(out.champion, { level: 5, points: 120_000, lastPlayTime: 1003 });
  assert.strictEqual(out.position, 2);
  assert.deepStrictEqual(out.top.map(t => t.championId), [222, 3, 1]);
  assert.strictEqual(out.totalPoints, 1_025_000);
  assert.strictEqual(out.championsPlayed, 3);   // el de 0 puntos no cuenta
});

test("masterySummary sin maestría con ese campeón (primera vez) y con lista vacía", () => {
  const out = masterySummary([m(1, 5000)], 99);
  assert.strictEqual(out.champion, null);
  assert.strictEqual(out.position, null);
  assert.deepStrictEqual(masterySummary(undefined, 1), { champion: null, position: null, top: [], totalPoints: 0, championsPlayed: 0 });
});
