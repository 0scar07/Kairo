const { Router } = require("express");
const { handle } = require("../lib/riot");
const { HttpError } = require("../lib/errors");
const { GAMES, TTL, normalizeTag, countryOf, brawlerIdOf, apiGet, playerGet } = require("../lib/supercell");

/**
 * Router de un juego de Supercell:
 *   GET /player/:tag   perfil del jugador
 *   GET /battles/:tag  últimas batallas (solo Brawl Stars y Clash Royale)
 *   GET /top?limit=10  mejores jugadores del mundo (sirve para descubrir tags)
 *        Brawl Stars además: &country=co (ranking de un país) y &brawler=16000000 (ranking de un brawler)
 *   GET /club/:tag     club (Brawl Stars) o clan (Clash Royale, Clash of Clans) con sus miembros y la guerra actual
 *   GET /brawlers      lista de brawlers con sus habilidades estelares y gadgets (solo Brawl Stars)
 *   GET /events        eventos activos y próximos con su modo y mapa (solo Brawl Stars)
 * El tag se acepta con o sin "#".
 */
function createSupercellRouter(gameId) {
  const router = Router();

  router.get("/player/:tag", handle(async (req, res) => {
    res.json(await playerGet(gameId, normalizeTag(req.params.tag), "", TTL.player));
  }));

  router.get("/top", handle(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    let path = GAMES[gameId].top;
    if (gameId === "brawlstars" && (req.query.country || req.query.brawler)) {
      const country = countryOf(req.query.country);
      if (!country) throw new HttpError(400, "País no válido: usa el código de 2 letras (co, mx…) o global", { code: "INVALID_COUNTRY" });
      const brawler = req.query.brawler ? brawlerIdOf(req.query.brawler) : null;
      if (req.query.brawler && !brawler) throw new HttpError(400, "Brawler no válido", { code: "INVALID_BRAWLER" });
      path = brawler ? `/rankings/${country}/brawlers/${brawler}` : `/rankings/${country}/players`;
    }
    const data = await apiGet(gameId, `${path}?limit=${limit}`, TTL.top);
    res.json({ items: data.items || [] });
  }));

  router.get("/club/:tag", handle(async (req, res) => {
    const tag = normalizeTag(req.params.tag);
    const { club: base, war } = GAMES[gameId];
    const notFound = gameId === "brawlstars" ? "Club no encontrado: revisa el tag" : "Clan no encontrado: revisa el tag";
    const [club, current] = await Promise.all([
      apiGet(gameId, `${base}/%23${tag}`, TTL.club, notFound),
      // La guerra es opcional: un registro privado o un clan sin guerra no rompen la página
      war ? apiGet(gameId, `${base}/%23${tag}${war}`, TTL.club).catch(() => null) : Promise.resolve(null),
    ]);
    res.json({ club, war: current });
  }));

  if (gameId === "brawlstars") {
    router.get("/brawlers", handle(async (_req, res) => {
      const data = await apiGet(gameId, "/brawlers", TTL.brawlers);
      res.json({ items: data.items || [] });
    }));

    // Rotación de eventos: la API responde una lista con startTime, endTime y event { id (mapa), mode, map }
    router.get("/events", handle(async (_req, res) => {
      const data = await apiGet(gameId, "/events/rotation", TTL.events);
      const list = Array.isArray(data) ? data : data.items || [];
      res.json({
        items: list.map(e => ({
          startTime: e.startTime, endTime: e.endTime, slotId: e.slotId ?? null,
          event: { id: e.event?.id ?? null, mode: e.event?.mode ?? null, map: e.event?.map ?? null, modifiers: e.event?.modifiers || [] },
        })),
      });
    }));
  }

  if (GAMES[gameId].battlelog) {
    router.get("/battles/:tag", handle(async (req, res) => {
      const data = await playerGet(gameId, normalizeTag(req.params.tag), "/battlelog", TTL.battles);
      // Brawl Stars responde { items: [...] } y Clash Royale un array: la app recibe siempre { items }
      res.json({ items: Array.isArray(data) ? data : data.items || [] });
    }));
  }

  return router;
}

module.exports = { createSupercellRouter };
