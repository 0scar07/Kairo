const test = require("node:test");
const assert = require("node:assert");
const wr = require("../lib/wildrift");

const HEROES = wr.normalizeHeroes({
  heroList: {
    10001: { heroId: "10001", poster: "https://game.gtimg.cn/images/lgamem/act/lrlib/img/Posters/Garen_0.jpg", avatar: "https://x/H_S_10001.png" },
    10012: { heroId: "10012", poster: "https://game.gtimg.cn/images/lgamem/act/lrlib/img/Posters/Jinx_0.jpg", avatar: "https://x/H_S_10012.png" },
    10166: { heroId: "10166", poster: "https://game.gtimg.cn/images/lgamem/act/lrlib/img/Posters/Norra_0.jpg" },
  },
});
const row = (hero_id, strength, level, win, pick, ban, trend) => ({
  hero_id: String(hero_id), strength: String(strength), strength_level: String(level),
  win_rate_percent: String(win), appear_rate_percent: String(pick), forbid_rate_percent: String(ban),
  win_rate_float: String(trend), dtstatdate: "20261018",
});
const RAW = {
  result: 0,
  data: {
    0: { 3: [row(10012, 2, 1, 52.1, 10, 4, -1), row(10166, 1, 0, 54.2, 18.4, 22.1, 1)], 2: [row(10001, 5, 3, 49.8, 6, 1, 0)] },
    3: { 3: [row(10012, 1, 0, 55, 12, 9, 1)] },
  },
};

test("championKey saca el nombre en inglés del póster oficial", () => {
  assert.strictEqual(wr.championKey({ poster: "https://a/Posters/MonkeyKing_3.jpg" }), "MonkeyKing");
  assert.strictEqual(wr.championKey({ poster: "" }), null);
});

test("normalizeMeta traduce carriles y tiers, y ordena cada carril por fuerza", () => {
  const meta = wr.normalizeMeta(RAW, HEROES, "diamond");
  assert.strictEqual(meta.date, "2026-10-18");
  assert.deepStrictEqual(Object.keys(meta.lanes).sort(), ["baron", "dragon"]);
  const [first, second] = meta.lanes.dragon;
  assert.strictEqual(first.key, "Norra");
  assert.strictEqual(first.tier, "S+");
  assert.strictEqual(first.winRate, 54.2);
  assert.strictEqual(first.trend, 1);
  assert.strictEqual(second.key, "Jinx");
  assert.strictEqual(second.tier, "S");
  assert.strictEqual(second.trend, -1);
  assert.strictEqual(meta.lanes.baron[0].tier, "B");
});

test("normalizeMeta devuelve null si ese rango no viene en los datos", () => {
  assert.strictEqual(wr.normalizeMeta(RAW, HEROES, "legend"), null);
});

test("championStats junta un campeón en cada rango y carril donde aparece", () => {
  const c = wr.championStats(RAW, HEROES, "10012");
  assert.strictEqual(c.key, "Jinx");
  assert.deepStrictEqual(Object.keys(c.byRank).sort(), ["challenger", "diamond"]);
  assert.strictEqual(c.byRank.challenger.dragon.winRate, 55);
  assert.strictEqual(c.byRank.diamond.dragon.of, 2);
  assert.strictEqual(wr.championStats(RAW, HEROES, "99999"), null);
});

test("normalizeMatch arma equipos con su marcador y el stream principal", () => {
  const m = wr.normalizeMatch({
    id: 7, status: "running", begin_at: "2026-10-19T00:00:00Z", number_of_games: 5,
    league: { name: "WRL", image_url: "https://img/wrl.png" }, tournament: { name: "Playoffs" },
    opponents: [{ opponent: { id: 1, name: "Team A", acronym: "TA" } }, { opponent: { id: 2, name: "Team B", acronym: "TB" } }],
    results: [{ team_id: 1, score: 2 }, { team_id: 2, score: 1 }],
    games: [{ position: 1, status: "finished", winner: { id: 1 } }],
    streams_list: [{ main: false, raw_url: "https://b" }, { main: true, raw_url: "https://a" }],
  });
  assert.deepStrictEqual(m.teams.map(t => [t.acronym, t.score]), [["TA", 2], ["TB", 1]]);
  assert.strictEqual(m.bestOf, 5);
  assert.strictEqual(m.stream, "https://a");
  assert.strictEqual(m.games[0].winnerId, 1);
});

test("normalizeNews saca las noticias de la página, sin repetir y de la más nueva a la más vieja", () => {
  const item = (title, date, url) => ({ title, publishedAt: date, action: { payload: { url } }, media: { url: `https://img/${title}.jpg` } });
  const data = { props: { pageProps: { page: { blades: [
    { items: [item("7.3a", "2026-09-29T09:00:00Z", "/es-mx/news/game-updates/wild-rift-patch-notes-7-3a"), item("Video", "2026-10-01T00:00:00Z", "https://www.youtube.com/watch?v=x")] },
    { items: [item("7.3b", "2026-10-14T09:00:00Z", "/es-mx/news/game-updates/wild-rift-patch-notes-7-3b"), item("7.3a", "2026-09-29T09:00:00Z", "/es-mx/news/game-updates/wild-rift-patch-notes-7-3a"), item("Hoja de ruta", "2026-09-01T00:00:00Z", "/es-mx/news/game-updates/champion-roadmap-2026")] },
  ] } } } };
  const news = wr.normalizeNews(data);
  assert.deepStrictEqual(news.map(n => n.title), ["7.3b", "7.3a", "Hoja de ruta"]);
  assert.strictEqual(news[0].url, "https://wildrift.leagueoflegends.com/es-mx/news/game-updates/wild-rift-patch-notes-7-3b");
  assert.strictEqual(news[0].patch, true);
  assert.strictEqual(news[2].patch, false);
  assert.strictEqual(news[0].image, "https://img/7.3b.jpg");
});

test("nextData lee el JSON embebido y devuelve null si no está o está roto", () => {
  assert.deepStrictEqual(wr.nextData('<html><script id="__NEXT_DATA__" type="application/json">{"a":1}</script></html>'), { a: 1 });
  assert.strictEqual(wr.nextData("<html></html>"), null);
  assert.strictEqual(wr.nextData('<script id="__NEXT_DATA__">{roto</script>'), null);
});
