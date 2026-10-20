/**
 * Clips de la pestaña Clips de Explorar: los Shorts de los canales oficiales de cada juego en YouTube, leídos del feed
 * público de cada canal (https://www.youtube.com/feeds/videos.xml?channel_id=…, sin key). Cada feed trae sus últimos
 * 15 videos con vistas y "me gusta"; solo se toman los Shorts (enlace /shorts/), que son verticales.
 */

// Canal oficial de cada juego (y de sus esports). Dota 2 no publica Shorts.
const CHANNELS = [
  { game: "lol", channel: "UC2t5bjwHdUX4vM2g8TRDq5g", name: "League of Legends" },
  { game: "lol", channel: "UCvqRdlKsE5Q8mf8YXbdIJLw", name: "LoL Esports", esports: true },
  { game: "valorant", channel: "UC8CX0LD98EDXl4UYX1MDCXg", name: "VALORANT" },
  { game: "wildrift", channel: "UCd0ZomI5mPkrV735wul5kiw", name: "League of Legends: Wild Rift" },
  { game: "tft", channel: "UCiVO_mThS9B3tNc_kzpn-3g", name: "Teamfight Tactics" },
  { game: "fortnite", channel: "UClG8odDC8TS6Zpqk9CGVQiQ", name: "Fortnite" },
  { game: "apex", channel: "UC0ZV6M2THA81QT9hrVWJG3A", name: "Apex Legends" },
  { game: "pubg", channel: "UCnXDQbqIdp-HQuDyM4p12ng", name: "PUBG: BATTLEGROUNDS" },
  { game: "brawlstars", channel: "UCooVYzDxdwTtGYAkcPmOgOw", name: "Brawl Stars" },
  { game: "clashroyale", channel: "UC_F8DoJf9MZogEOU51TpTbQ", name: "Clash Royale" },
  { game: "clashofclans", channel: "UCD1Em4q90ZUK2R5HKesszJg", name: "Clash of Clans" },
];

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
// Las entidades que usa el feed de YouTube en los títulos
const decode = s => String(s || "")
  .replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  .trim();
const tag = (xml, name) => new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml)?.[1];

/** Shorts de un feed: [{ id, game, channel, esports, title, date, views, likes, image, fallback, url }] */
function parseFeed(xml, source) {
  return String(xml || "").split("<entry>").slice(1)
    .filter(e => /youtube\.com\/shorts\//.test(e))
    .map(e => {
      const id = tag(e, "yt:videoId");
      if (!VIDEO_ID.test(id || "")) return null;
      const views = Number(/<media:statistics[^>]*views="(\d+)"/.exec(e)?.[1]);
      const likes = Number(/<media:starRating[^>]*count="(\d+)"/.exec(e)?.[1]);
      return {
        id,
        game: source.game,
        channel: source.name,
        esports: Boolean(source.esports),
        title: decode(tag(e, "title")),
        date: tag(e, "published") || null,
        views: Number.isFinite(views) ? views : null,
        likes: Number.isFinite(likes) ? likes : null,
        image: `https://i.ytimg.com/vi/${id}/oar2.jpg`,          // portada vertical de los Shorts
        fallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        url: `https://www.youtube.com/shorts/${id}`,
      };
    })
    .filter(Boolean);
}

/**
 * Mezcla los clips de todos los canales para "Para ti": van turnándose los juegos (primero el que publicó lo más nuevo)
 * y de cada juego sale su clip más nuevo que quede, así ningún canal que publica mucho tapa a los demás.
 */
function mix(lists, limit = 90) {
  const byGame = new Map();
  for (const c of lists.flat()) byGame.set(c.game, [...(byGame.get(c.game) || []), c]);
  const queues = [...byGame.values()]
    .map(q => q.sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))))
    .sort((a, b) => String(b[0].date || "").localeCompare(String(a[0].date || "")));
  const out = [];
  while (out.length < limit && queues.some(q => q.length)) {
    for (const q of queues) if (q.length && out.length < limit) out.push(q.shift());
  }
  return out;
}

module.exports = { CHANNELS, parseFeed, mix };
