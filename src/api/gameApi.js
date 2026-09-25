import { api } from "./client";

// Cliente mínimo de los juegos por nombre (Dota 2, Fortnite, Apex Legends y PUBG): GET /{juego}{ruta}?params
export function createGameApi(gameId) {
  return {
    get: (path, params) => api.get(`/${gameId}${path}`, { params }).then(r => r.data),
  };
}
