const test = require("node:test");
const assert = require("node:assert");
const news = require("../lib/news");

test("plainText quita etiquetas anidadas y separa las palabras de bloques distintos", () => {
  assert.strictEqual(news.plainText("<li><strong>Modo</strong><ul><li>Corregimos</li></ul></li>"), "Modo Corregimos");
  assert.strictEqual(news.plainText("<<b>script>alert(1)<</b>/script>"), "alert(1)");   // la etiqueta escondida también se quita
  assert.strictEqual(news.plainText("Tom &amp; Jerry&nbsp;&quot;ok&quot;"), "Tom & Jerry \"ok\"");
});

test("parseChange separa antes y ahora y calcula si mejora (un enfriamiento o un costo más bajo también mejora)", () => {
  assert.deepStrictEqual(news.parseChange("Daño: 70 / 105 ⇒ 70 / 115"), { label: "Daño", before: "70 / 105", after: "70 / 115", dir: 1 });
  assert.strictEqual(news.parseChange("Enfriamiento: 22 seg ⇒ 20 seg").dir, 1);
  assert.strictEqual(news.parseChange("Costo de Maná: 46 / 42 ⇒ 30").dir, 1);
  assert.strictEqual(news.parseChange("Precio: 3000 → 2900").dir, 1);
  assert.strictEqual(news.parseChange("Armadura básica: 25 ⇒ 23").dir, -1);
  assert.strictEqual(news.parseChange("Fijación: Habilitada ⇒ Eliminada").dir, 0);
  assert.deepStrictEqual(news.parseChange("Corregimos un error"), { text: "Corregimos un error" });
});

const page = blades => ({ props: { pageProps: { page: { title: "T", blades } } } });

test("parseArticle arma secciones y campeones de LoL con su splash y cuenta los que suben y bajan", () => {
  const block = (id, name, change) => `<div class="patch-change-block"><div><p><a class="reference-link"><img src="https://am-a.akamaihd.net/image?f=https://ddragon.leagueoflegends.com/cdn/16.17.1/img/champion/${id}.png"></a></p><h3 class="change-title">${name}</h3><blockquote class="blockquote context"><p>Porque sí.</p></blockquote><h4 class="change-detail-title">W</h4><ul><li><strong>Daño</strong>: ${change}</li></ul></div></div>`;
  const body = `<p>Intro</p><h2>Campeones</h2>${block("Swain", "Swain", "10 ⇒ 20")}${block("Ashe", "Ashe", "3.5 ⇒ 3")}<h2>ARAM</h2><h4>Bardo</h4><ul><li>Recarga de Meep: 8 seg ⇒ 5 seg</li></ul>`;
  const a = news.parseArticle(page([
    { type: "articleMasthead", title: "Parche 26.20", publishDate: "2026-10-06T18:00:00Z", banner: { url: "https://cmsassets.rgpub.io/x.jpg" }, description: { body: "<p>Resumen</p>" } },
    { type: "patchNotesRichText", richText: { body } },
  ]));
  assert.strictEqual(a.title, "Parche 26.20");
  assert.strictEqual(a.image, "https://cmsassets.rgpub.io/x.jpg?w=1200");
  assert.strictEqual(a.summary, "Resumen");
  assert.deepStrictEqual(a.sections.map(s => s.title), ["Campeones", "ARAM"]);
  const [swain, ashe] = a.sections[0].entries;
  assert.strictEqual(swain.kind, "champion");
  assert.strictEqual(swain.banner, "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Swain_0.jpg");
  assert.strictEqual(swain.context, "Porque sí.");
  assert.strictEqual(swain.dir, 1);
  assert.strictEqual(ashe.dir, -1);
  assert.deepStrictEqual(a.counts, { champions: 2, up: 1, down: 1, items: 0 });
  assert.strictEqual(a.sections[1].groups[0].title, "Bardo");
  assert.strictEqual(a.sections[1].groups[0].lines[0].dir, 1);
});

test("parseArticle lee los cambios estructurados de Wild Rift", () => {
  const a = news.parseArticle(page([{ type: "characterChanges", title: "CAMBIOS", characters: [{
    character: { name: "VOLIBEAR", media: { url: "https://cmsassets.rgpub.io/v.jpg" }, role: { label: "PELEADOR" } },
    summary: { body: "<p>Más daño.</p>" },
    changes: [{ title: "Zarpazo", description: { body: "<ul><li>Daño: 100% → 110%</li></ul>" } }],
  }] }]));
  const e = a.sections[0].entries[0];
  assert.strictEqual(e.name, "Volibear");
  assert.strictEqual(e.banner, "https://cmsassets.rgpub.io/v.jpg?w=900");
  assert.strictEqual(e.dir, 1);
  assert.strictEqual(a.counts.up, 1);
});

test("riotNews y articlePath: solo artículos de la propia web", () => {
  const item = (title, date, url) => ({ title, publishedAt: date, action: { payload: { url } }, media: { url: "https://img" }, category: { machineName: "game-updates" } });
  const list = news.riotNews({ a: [item("26.20", "2026-10-06", "/es-mx/news/game-updates/league-of-legends-patch-26-20-notes"), item("Video", "2026-10-07", "https://youtube.com/x")] }, "https://www.leagueoflegends.com");
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].patch, true);
  assert.strictEqual(list[0].category, "game_updates");
  assert.strictEqual(news.articlePath("/es-mx/news/game-updates/league-of-legends-patch-26-20-notes"), true);
  assert.strictEqual(news.articlePath("//evil.com/x"), false);
  assert.strictEqual(news.articlePath("/es-mx/news/../../etc"), false);
});

test("steamItem saca la imagen del anuncio y un resumen sin códigos", () => {
  const n = news.steamItem({ title: "7.41f Gameplay Patch", date: 1760000000, url: "https://steam/x", contents: "{STEAM_CLAN_IMAGE}/123/abc.png [b]Hola[/b] mundo" });
  assert.strictEqual(n.image, "https://clan.akamai.steamstatic.com/images/123/abc.png");
  assert.strictEqual(n.summary, "Hola mundo");
  assert.strictEqual(n.patch, true);
});
