import axios from "axios";
import { API_BASE } from "../constants/config";

export const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

export const pingServer = () => api.get("/health", { timeout: 4000 }).then(r => r.data);

/**
 * Cliente de un juego: prefija las rutas con /{gameId} y añade ?region= a cada petición.
 * Lo comparten los módulos de LoL y TFT (el backend tiene la misma forma para ambos).
 */
export function createGameClient(gameId) {
  const get = (path, region, params = {}) =>
    api.get(`/${gameId}${path}`, { params: { region, ...params } }).then(r => r.data);

  return {
    account:   (gameName, tagLine, region) =>
      get(`/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, region),
    summoner:  (puuid, region) => get(`/summoner/${puuid}`, region),
    ranked:    (puuid, region) => get(`/ranked/${puuid}`, region),
    matchIds:  (puuid, region, start, count) => get(`/matches/${puuid}`, region, { start, count }),
    match:     (id, region) => get(`/match/${id}`, region),
  };
}

// Descarga el detalle de varias partidas; si alguna falla se omite en vez de romper todo
export async function fetchMatches(client, ids, region) {
  const results = await Promise.allSettled(ids.map(id => client.match(id, region)));
  const failed = results.filter(r => r.status === "rejected");
  if (failed.length) console.warn(`${failed.length} partida(s) no se pudieron cargar:`, failed[0].reason?.message);
  return results.filter(r => r.status === "fulfilled").map(r => r.value);
}

/**
 * Perfil común a los juegos: cuenta + resumen + rango + primera página de partidas.
 * El rango es opcional: si falla, el perfil se muestra igual con `rankedError`.
 */
export async function loadProfile(client, { gameName, tagLine, region, pageSize }) {
  const account = await client.account(gameName, tagLine, region);
  const [summoner, ranked, page] = await Promise.all([
    client.summoner(account.puuid, region),
    client.ranked(account.puuid, region).then(data => ({ data }), error => ({ error })),
    loadMatchPage(client, account.puuid, region, 0, pageSize),
  ]);
  return {
    region,
    account,
    summoner,
    ranked: ranked.data || [],
    rankedError: ranked.error ? ranked.error.response?.data?.error || ranked.error.message : null,
    ...page,
  };
}

// Una página de partidas. nextStart cuenta los IDs recibidos (no las partidas cargadas)
// para no repetir páginas si alguna falla.
export async function loadMatchPage(client, puuid, region, start, count) {
  const ids = await client.matchIds(puuid, region, start, count);
  const matches = await fetchMatches(client, ids, region);
  return { matches, hasMore: ids.length === count, nextStart: start + ids.length };
}
