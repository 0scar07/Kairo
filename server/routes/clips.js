const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream } = require("../lib/upstream");
const clips = require("../lib/clips");

/**
 * Clips (Shorts oficiales de YouTube de cada juego) para la pestaña Clips de Explorar.
 *   GET /clips     todos, mezclados ("Para ti"); cada clip trae su juego y `esports` si viene de un canal de esports
 * Con YOUTUBE_API_KEY se usa la API oficial de YouTube; sin ella, el feed público de cada canal.
 * Los feeds de YouTube responden 404 a menudo (sobre todo a servidores en la nube): cada canal se reintenta, se piden de a
 * pocos, si uno falla se usa su última copia buena y, si respondieron pocos canales, se vuelve a intentar en 2 minutos
 * en vez de esperar los 20 de siempre. Así el feed se va completando solo.
 */
const MIN = 60 * 1000;
const youtube = createUpstream({ id: "clips-youtube", name: "YouTube", base: "https://www.youtube.com", baseEnv: "YOUTUBE_FEEDS_BASE", timeout: 10000 });
// Con YOUTUBE_API_KEY (gratis en Google Cloud) se usa la API oficial, que no falla como los feeds públicos
const ytApi = createUpstream({
  id: "clips-youtube-api", name: "YouTube Data API", base: "https://www.googleapis.com/youtube/v3", baseEnv: "YOUTUBE_API_BASE",
  keyEnv: "YOUTUBE_API_KEY", query: key => ({ key }), timeout: 10000,
});

// Con la API: la lista de subidas del canal (1 unidad) y sus videos con duración y estadísticas (1 unidad)
async function apiClips(source) {
  const list = await ytApi.get("/playlistItems", { ttl: 20 * MIN, query: { part: "contentDetails", playlistId: clips.uploadsOf(source.channel), maxResults: 20 } });
  const ids = (list?.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return [];
  const videos = await ytApi.get("/videos", { ttl: 20 * MIN, query: { part: "snippet,contentDetails,statistics", id: ids.join(",") } });
  return clips.parseApi(videos, source);
}
const router = Router();
const lastGood = new Map();   // canal → sus últimos Shorts leídos bien
let memo = null;              // { at, ttl, items }
let pending = null;           // una sola lectura a la vez

const wait = ms => new Promise(r => setTimeout(r, ms));
async function channelClips(source) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const list = ytApi.configured()
        ? await apiClips(source)
        : clips.parseFeed(await youtube.get("/feeds/videos.xml", { ttl: 20 * MIN, query: { channel_id: source.channel } }), source);
      lastGood.set(source.channel, list);
      return list;
    } catch {
      await wait(500 * (attempt + 1));
    }
  }
  return lastGood.get(source.channel) || [];
}

async function load() {
  const lists = [];
  for (let i = 0; i < clips.CHANNELS.length; i += 3) {
    lists.push(...await Promise.all(clips.CHANNELS.slice(i, i + 3).map(channelClips)));
  }
  const working = lists.filter(l => l.length).length;
  if (!working) throw new HttpError(502, "No se pudieron leer los clips", { code: "UPSTREAM_ERROR" });
  // Con menos de la mitad de los canales, se reintenta pronto
  memo = { at: Date.now(), ttl: working * 2 >= clips.CHANNELS.length ? 20 * MIN : 2 * MIN, items: clips.mix(lists) };
  return memo.items;
}

router.get("/", handle(async (req, res) => {
  let items;
  if (memo && Date.now() - memo.at < memo.ttl) items = memo.items;
  else {
    pending = pending || load().finally(() => { pending = null; });
    // Si ya había una lista, se responde con ella mientras se renueva (no se hace esperar a nadie)
    items = memo ? memo.items : await pending;
  }
  res.set("Cache-Control", "public, max-age=300");
  res.json({ items });
}));

module.exports = router;
