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

/** Duración ISO 8601 de la API de YouTube ("PT1M5S") → segundos */
function durationSeconds(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ""));
  if (!m) return null;
  const [, d, h, min, sec] = m.map(x => Number(x) || 0);
  return d * 86400 + h * 3600 + min * 60 + sec;
}

// Los Shorts duran hasta 3 minutos; con la API (que no los marca) se reconocen por eso
const SHORT_MAX = 180;

/**
 * Shorts con la API oficial de YouTube (con YOUTUBE_API_KEY): los videos de la lista de subidas del canal con su
 * duración y estadísticas (videos.list). Mismo formato que parseFeed.
 */
function parseApi(videos, source) {
  return (videos?.items || [])
    .filter(v => VIDEO_ID.test(v.id || "") && (durationSeconds(v.contentDetails?.duration) ?? 999) <= SHORT_MAX)
    .map(v => ({
      id: v.id,
      game: source.game,
      channel: source.name,
      esports: Boolean(source.esports),
      title: decode(v.snippet?.title),
      date: v.snippet?.publishedAt || null,
      views: v.statistics?.viewCount != null ? Number(v.statistics.viewCount) : null,
      likes: v.statistics?.likeCount != null ? Number(v.statistics.likeCount) : null,
      image: `https://i.ytimg.com/vi/${v.id}/oar2.jpg`,
      fallback: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      url: `https://www.youtube.com/shorts/${v.id}`,
    }));
}

/** Lista de subidas de un canal: "UC…" → "UU…" */
const uploadsOf = channel => `UU${String(channel).slice(2)}`;

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

// Canales sugeridos para "Siguiendo" (pros y streamers), por juego. Se resuelven con la API de YouTube por su @: los
// que no existan simplemente no aparecen.
const SUGGESTED = {
  lol: ["@Caedrel", "@T1", "@G2Esports"],
  valorant: ["@TenZ", "@tarik", "@Sentinels"],
  fortnite: ["@Ninja"],
  apex: ["@iiTzTimmy"],
  brawlstars: ["@KairosTime"],
};

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const HANDLE = /^@?([A-Za-z0-9._-]{3,30})$/;

/**
 * Lo que alguien pega para seguir un canal → { id } o { handle }; null si no se entiende.
 * Acepta "UC…", "@nombre", "nombre" y enlaces de YouTube (/@nombre, /channel/UC…, con o sin www/m.).
 */
function channelInput(raw) {
  const text = String(raw || "").trim();
  if (!text || text.length > 200) return null;
  if (CHANNEL_ID.test(text)) return { id: text };
  const url = /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(.+)$/i.exec(text);
  const path = url ? url[1].split(/[?#]/)[0].replace(/\/+$/, "") : null;
  if (path) {
    const ch = /^channel\/(UC[A-Za-z0-9_-]{22})/.exec(path);
    if (ch) return { id: ch[1] };
    const at = /^@([A-Za-z0-9._-]{3,30})(?:\/.*)?$/.exec(path);
    return at ? { handle: `@${at[1]}` } : null;
  }
  const h = HANDLE.exec(text);
  return h ? { handle: `@${h[1]}` } : null;
}

/** Canal de la API de YouTube (channels.list) al formato de la app */
function channelInfo(c) {
  if (!c?.id) return null;
  const thumbs = c.snippet?.thumbnails || {};
  return {
    id: c.id,
    title: decode(c.snippet?.title) || c.id,
    handle: c.snippet?.customUrl || null,
    image: thumbs.medium?.url || thumbs.default?.url || null,
    subs: c.statistics?.hiddenSubscriberCount ? null : (c.statistics?.subscriberCount != null ? Number(c.statistics.subscriberCount) : null),
  };
}

module.exports = { CHANNELS, SUGGESTED, parseFeed, parseApi, durationSeconds, uploadsOf, mix, channelInput, channelInfo };
