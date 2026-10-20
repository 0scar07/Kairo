const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { createUpstream, cache } = require("../lib/upstream");
const clips = require("../lib/clips");

/**
 * Clips (Shorts oficiales de YouTube de cada juego) para la pestaña Clips de Explorar. Sin key.
 *   GET /clips     todos, mezclados ("Para ti"); cada clip trae su juego y `esports` si viene de un canal de esports
 * Los feeds de YouTube a veces responden 404 sin motivo: cada canal se reintenta, se piden de a pocos y, si uno falla,
 * se usa su última copia buena.
 */
const youtube = createUpstream({ id: "clips-youtube", name: "YouTube", base: "https://www.youtube.com", baseEnv: "YOUTUBE_FEEDS_BASE", timeout: 10000 });
const router = Router();
const MIN = 60 * 1000;
const lastGood = new Map();   // canal → sus últimos Shorts leídos bien

const wait = ms => new Promise(r => setTimeout(r, ms));
async function channelClips(source) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const list = clips.parseFeed(await youtube.get("/feeds/videos.xml", { ttl: 20 * MIN, query: { channel_id: source.channel } }), source);
      lastGood.set(source.channel, list);
      return list;
    } catch {
      await wait(400 * (attempt + 1));
    }
  }
  return lastGood.get(source.channel) || [];
}

router.get("/", handle(async (req, res) => {
  // Ya mezclados: 20 min (los canales publican pocos Shorts al día)
  const items = await cache.wrap("clips:all", 20 * MIN, async () => {
    const lists = [];
    for (let i = 0; i < clips.CHANNELS.length; i += 3) {
      lists.push(...await Promise.all(clips.CHANNELS.slice(i, i + 3).map(channelClips)));
    }
    if (!lists.some(l => l.length)) throw new HttpError(502, "No se pudieron leer los clips", { code: "UPSTREAM_ERROR" });
    return clips.mix(lists);
  });
  res.set("Cache-Control", "public, max-age=600");
  res.json({ items });
}));

module.exports = router;
