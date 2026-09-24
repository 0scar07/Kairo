import { api } from "./client";

/**
 * Cliente de un juego de Supercell: el backend expone /{juego}/player/:tag y (Brawl Stars y
 * Clash Royale) /{juego}/battles/:tag.
 */
export function createSupercellClient(gameId) {
  const get = path => api.get(`/${gameId}${path}`).then(r => r.data);
  return {
    player:  tag => get(`/player/${encodeURIComponent(tag)}`),
    battles: tag => get(`/battles/${encodeURIComponent(tag)}`).then(d => d.items || []),
  };
}
