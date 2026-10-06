const test = require("node:test");
const assert = require("node:assert");
const { queueOf, limitOf, topEntries, withRiotIds } = require("../lib/leaderboard");

const entry = (puuid, leaguePoints, wins = 100, losses = 80) => ({ puuid, leaguePoints, wins, losses, rank: "I", veteran: true });

test("topEntries ordena por LP (y por victorias si empatan) y recorta", () => {
  const top = topEntries([entry("a", 900), entry("b", 1500), entry("c", 1500, 140), entry("d", 1200)], 3);
  assert.deepStrictEqual(top.map(e => e.puuid), ["c", "b", "d"]);
  assert.deepStrictEqual(top[0], { puuid: "c", leaguePoints: 1500, wins: 140, losses: 80 });   // sin campos que la web no usa
});

test("topEntries descarta entradas sin puuid y aguanta listas vacías", () => {
  assert.deepStrictEqual(topEntries([{ leaguePoints: 2000 }, entry("x", 10)], 10).map(e => e.puuid), ["x"]);
  assert.deepStrictEqual(topEntries(undefined, 10), []);
});

test("withRiotIds une cada entrada con su cuenta y deja sin nombre la que falló", () => {
  const top = topEntries([entry("a", 2000), entry("b", 1000)], 2);
  const out = withRiotIds(top, [{ puuid: "a", gameName: "Faker", tagLine: "KR1" }, null]);
  assert.deepStrictEqual(out[0], { puuid: "a", gameName: "Faker", tagLine: "KR1", leaguePoints: 2000, wins: 100, losses: 80 });
  assert.strictEqual(out[1].gameName, null);
  assert.strictEqual(out[1].tagLine, null);
});

test("queueOf y limitOf validan lo que llega por la URL", () => {
  assert.strictEqual(queueOf("RANKED_FLEX_SR"), "RANKED_FLEX_SR");
  assert.strictEqual(queueOf("CUALQUIERA"), "RANKED_SOLO_5x5");
  assert.strictEqual(queueOf(undefined), "RANKED_SOLO_5x5");
  assert.strictEqual(limitOf("5"), 5);
  assert.strictEqual(limitOf("999"), 50);
  assert.strictEqual(limitOf("0"), 10);   // 0 no es válido: valor por defecto
  assert.strictEqual(limitOf("abc"), 10);
});
