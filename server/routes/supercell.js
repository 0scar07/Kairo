const { Router } = require("express");
const { handle } = require("../lib/riot");
const { GAMES, TTL, normalizeTag, playerGet } = require("../lib/supercell");

/**
 * Router de un juego de Supercell:
 *   GET /player/:tag   perfil del jugador
 *   GET /battles/:tag  últimas batallas (solo Brawl Stars y Clash Royale)
 * El tag se acepta con o sin "#".
 */
function createSupercellRouter(gameId) {
  const router = Router();

  router.get("/player/:tag", handle(async (req, res) => {
    res.json(await playerGet(gameId, normalizeTag(req.params.tag), "", TTL.player));
  }));

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
