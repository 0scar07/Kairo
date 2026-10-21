const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream, cache } = require("../lib/upstream");
const news = require("../lib/news");
const ps = require("../lib/pandascore");
const { nextData } = require("../lib/wildrift");

/**
 * Noticias de todos los juegos (pestaña Noticias de Explorar). Fuentes públicas sin key; si alguna falla, las demás
 * se siguen mostrando.
 *   GET /news?lang=es|en|pt|fr|de|it|tr|pl|ko            lo último de cada juego, de lo más nuevo a lo más viejo
 *   GET /news/article?game=lol&path=/es-mx/news/…   un artículo de Riot (notas del parche) listo para leer en la app
 */
const sites = Object.fromEntries(Object.entries(news.RIOT_SITES).map(([game, base]) => [game, createUpstream({
  id: `news-${game}`, name: `Noticias (${game})`, base, timeout: 12000, headers: () => ({ "User-Agent": "Kairo (+https://github.com/0scar07/Kairo)" }),
})]));
const steam = createUpstream({ id: "news-steam", name: "Steam", base: "https://api.steampowered.com", baseEnv: "STEAM_NEWS_BASE", timeout: 10000 });
const fortnite = createUpstream({ id: "news-fortnite", name: "Fortnite-API", base: "https://fortnite-api.com", timeout: 10000 });
// El campeón de la última gran final de Valorant (solo si el servidor tiene PANDASCORE_TOKEN)
const pandascore = createUpstream({
  id: "news-pandascore", name: "PandaScore", base: "https://api.pandascore.co", baseEnv: "PANDASCORE_BASE", keyEnv: "PANDASCORE_TOKEN",
  headers: key => ({ Authorization: `Bearer ${key}`, Accept: "application/json" }),
});

const MIN = 60 * 1000;
const PER_GAME = 6;
const router = Router();
const asJson = d => (typeof d === "string" ? JSON.parse(d) : d);

async function riotGame(game, locale) {
  const html = await sites[game].get(`/${locale}/news/`);
  const data = nextData(html);
  if (!data) return [];
  return news.riotNews(data, news.RIOT_SITES[game], PER_GAME).map(n => ({
    id: `${game}:${n.path}`,
    game,
    kind: n.patch ? "patch" : n.category === "esports" ? "esports" : "news",
    category: n.category,
    title: n.title,
    summary: null,
    date: n.date,
    image: news.sized(n.image, 900),
    color: /^#[0-9a-f]{6}$/i.test(n.color || "") ? n.color : null,
    url: n.url,
    article: { game, path: n.path },
  }));
}

async function steamGame(game) {
  const data = asJson(await steam.get("/ISteamNews/GetNewsForApp/v2/", {
    query: { appid: news.STEAM_APPS[game], count: PER_GAME, maxlength: 0, feeds: "steam_community_announcements" },
  }));
  return (data?.appnews?.newsitems || []).map(n => ({ id: `${game}:${n.gid}`, game, kind: news.steamItem(n).patch ? "patch" : "news", category: null, ...news.steamItem(n), article: null }));
}

async function fortniteNews(lang) {
  const data = asJson(await fortnite.get("/v2/news/br", { query: { language: news.FORTNITE_LANGS[lang] || "en" } }));
  // Fortnite no da la fecha de cada noticia (son las que se ven ahora en el juego): van sin fecha, al final
  return (data?.data?.motds || []).slice(0, PER_GAME).map(m => ({
    id: `fortnite:${m.id}`, game: "fortnite", kind: "event", category: null, title: m.title, summary: m.body || null,
    date: null, image: m.image || null, url: "https://www.fortnite.com/news", article: null,
  }));
}

async function valorantChampion() {
  if (!pandascore.configured()) return [];
  const [final] = asJson(await pandascore.get("/valorant/matches/past", { query: { per_page: 1, "search[name]": "Grand Final" } })) || [];
  if (!final) return [];
  const m = ps.normalizeMatch(final);
  const winner = m.teams.find(t => t.id === m.winnerId);
  const loser = m.teams.find(t => t.id !== m.winnerId);
  if (!winner || !loser) return [];
  return [{
    id: `valorant:champion:${m.id}`, game: "valorant", kind: "champion", category: "esports",
    title: winner.name, summary: null, date: m.beginAt, image: winner.image, url: null, article: null,
    champion: { team: winner, opponent: loser, event: m.serie || m.league?.name || null, matchId: m.id },
  }];
}

// Lo último de todos los juegos en un idioma. Ya resumidas (las páginas de Riot pesan cientos de KB): 30 min por idioma.
// También lo usan los avisos de parches nuevos (lib/patchTracker.js).
function loadNews(lang) {
  const locale = news.LOCALES[lang] || news.LOCALES.en;
  return cache.wrap(`news:${lang}`, 30 * MIN, async () => {
    const sources = [
      ...Object.keys(news.RIOT_SITES).map(game => riotGame(game, locale)),
      ...Object.keys(news.STEAM_APPS).map(steamGame),
      fortniteNews(lang),
      valorantChampion(),
    ];
    const results = await Promise.allSettled(sources);
    const all = results.flatMap(r => (r.status === "fulfilled" ? r.value : []));
    if (!all.length) throw new HttpError(502, "No se pudieron leer las noticias", { code: "UPSTREAM_ERROR" });
    return all.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  });
}

router.get("/", handle(async (req, res) => {
  const lang = news.LOCALES[String(req.query.lang)] ? String(req.query.lang) : "en";
  const items = await loadNews(lang);
  res.set("Cache-Control", "public, max-age=900");
  res.json({ items });
}));

router.get("/article", handle(async (req, res) => {
  const game = String(req.query.game || "");
  const path = String(req.query.path || "");
  if (!news.RIOT_SITES[game] || !news.articlePath(path)) throw new HttpError(400, "Artículo no válido", { code: "INVALID_ARTICLE" });
  const article = await cache.wrap(`news-article:${game}:${path}`, 6 * 60 * MIN, async () => {
    const parsed = news.parseArticle(nextData(await sites[game].get(path, { notFound: { message: "Artículo no encontrado", code: "ARTICLE_NOT_FOUND" } })));
    if (!parsed) throw new HttpError(502, "No se pudo leer el artículo", { code: "UPSTREAM_ERROR" });
    return { ...parsed, game, url: news.RIOT_SITES[game] + path };
  });
  res.set("Cache-Control", "public, max-age=3600");
  res.json(article);
}));

module.exports = router;
module.exports.loadNews = loadNews;
