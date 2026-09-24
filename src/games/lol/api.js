import axios from "axios";
import { API_BASE } from "../constants/config";

export const MATCH_PAGE = 10;

// Descarga el detalle de varias partidas; si alguna falla se omite en vez de romper todo
async function fetchMatches(ids) {
  const results = await Promise.allSettled(
    ids.map(id => axios.get(`${API_BASE}/match/${id}`).then(r => r.data))
  );
  return results.filter(r => r.status === "fulfilled").map(r => r.value);
}

// Pide `count` partidas a partir de la posición `start`.
// nextStart usa los IDs recibidos (no las partidas cargadas) para no repetir páginas si alguna falla.
export const getMoreMatches = async (puuid, start = 0, count = MATCH_PAGE) => {
  const ids = await axios.get(`${API_BASE}/matches/${puuid}`, { params: { start, count } });
  const matches = await fetchMatches(ids.data);
  return {
    matches,
    hasMore:   ids.data.length === count,
    nextStart: start + ids.data.length,
  };
};

export const searchPlayer = async (gameName, tagLine) => {
  const account = await axios.get(`${API_BASE}/account/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);

  const summoner = await axios.get(`${API_BASE}/summoner/${account.data.puuid}`);
  const ranked = await axios.get(`${API_BASE}/ranked/${account.data.puuid}`);
  const page = await getMoreMatches(account.data.puuid, 0, MATCH_PAGE);
  return {
    account: account.data,
    summoner: summoner.data,
    ranked: ranked.data,
    matches: page.matches,
    hasMore: page.hasMore,
    nextStart: page.nextStart,
  };
};

export const pingServer = () => axios.get(`${API_BASE}/health`, { timeout: 4000 }).then(r => r.data);
