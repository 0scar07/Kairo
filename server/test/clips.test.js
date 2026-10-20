const test = require("node:test");
const assert = require("node:assert");
const clips = require("../lib/clips");

const entry = (id, title, date, shorts = true) => `<entry><yt:videoId>${id}</yt:videoId><title>${title}</title><link rel="alternate" href="https://www.youtube.com/${shorts ? "shorts/" : "watch?v="}${id}"/><published>${date}</published><media:group><media:community><media:starRating count="27847" average="5.00"/><media:statistics views="1174298"/></media:community></media:group></entry>`;

test("parseFeed toma solo los Shorts, con vistas, me gusta y portada vertical", () => {
  const xml = `<feed><title>League of Legends</title>${entry("2oT4E_zCuJ8", "when your eyes deceive you &amp; more", "2026-10-16T00:00:00Z")}${entry("x2zBwRfKC3Y", "Video largo", "2026-10-15T00:00:00Z", false)}${entry("malo", "id roto", "2026-10-14T00:00:00Z")}</feed>`;
  const list = clips.parseFeed(xml, { game: "lol", name: "League of Legends" });
  assert.strictEqual(list.length, 1);
  assert.deepStrictEqual(list[0], {
    id: "2oT4E_zCuJ8", game: "lol", channel: "League of Legends", esports: false, title: "when your eyes deceive you & more",
    date: "2026-10-16T00:00:00Z", views: 1174298, likes: 27847, image: "https://i.ytimg.com/vi/2oT4E_zCuJ8/oar2.jpg",
    fallback: "https://i.ytimg.com/vi/2oT4E_zCuJ8/hqdefault.jpg", url: "https://www.youtube.com/shorts/2oT4E_zCuJ8",
  });
});

test("mix turna los juegos para que un canal que publica mucho no tape a los demás", () => {
  const c = (game, d) => ({ game, date: `2026-10-${String(d).padStart(2, "0")}` });
  const out = clips.mix([[c("lol", 19), c("lol", 18), c("lol", 17), c("lol", 16)], [c("valorant", 10)]]);
  assert.deepStrictEqual(out.map(x => x.game), ["lol", "valorant", "lol", "lol", "lol"]);
  assert.deepStrictEqual(out.filter(x => x.game === "lol").map(x => x.date), ["2026-10-19", "2026-10-18", "2026-10-17", "2026-10-16"]);
});
