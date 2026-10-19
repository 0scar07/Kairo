const test = require("node:test");
const assert = require("node:assert");
const ps = require("../lib/pandascore");

test("prize lee el premio con o sin separadores y traduce la moneda", () => {
  assert.deepStrictEqual(ps.prize("500000 United States Dollar"), { amount: 500000, currency: "USD" });
  assert.deepStrictEqual(ps.prize("36,500 United States Dollar"), { amount: 36500, currency: "USD" });
  assert.deepStrictEqual(ps.prize("10000 Euro"), { amount: 10000, currency: "EUR" });
  assert.strictEqual(ps.prize(null), null);
  assert.strictEqual(ps.prize("TBD"), null);
});

test("normalizeMatch saca la fase del nombre del partido", () => {
  const m = ps.normalizeMatch({ id: 1, name: "Grand Final: LOUD vs VIT", opponents: [], results: [] });
  assert.strictEqual(m.stage, "Grand Final");
  assert.strictEqual(ps.normalizeMatch({ id: 2, name: "LOUD vs VIT" }).stage, null);
});

test("normalizeTournament arma el nombre completo y el premio", () => {
  const t = ps.normalizeTournament({
    id: 9, name: "Playoffs", tier: "b", begin_at: "2026-10-22T18:00:00Z", prizepool: "500000 United States Dollar",
    league: { name: "VCT", image_url: "https://img/vct.png" }, serie: { full_name: "Game Changers Championship 2026" }, teams: [{}, {}, {}],
  });
  assert.strictEqual(t.name, "VCT · Game Changers Championship 2026 · Playoffs");
  assert.strictEqual(t.serie, "Game Changers Championship 2026");
  assert.strictEqual(t.teams, 3);
  assert.deepStrictEqual(t.prize, { amount: 500000, currency: "USD" });
});
