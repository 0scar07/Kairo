import { api, createGameClient, loadProfile, loadMatchPage } from "../../api/client";
import { ensureLolAssets } from "./assets";
import { activeLanguage } from "../../i18n";

export const MATCH_PAGE = 10;
// El perfil completa en segundo plano hasta esta cantidad de partidas para que las estadísticas por cola tengan más muestra
export const PROFILE_MATCHES = 20;

const client = createGameClient("lol");

// Perfil completo de un jugador de LoL: cuenta, invocador, rango, primeras partidas y maestría.
// Espera a los datos de runas y hechizos para que el detalle de partida ya tenga sus íconos.
export async function searchPlayer(gameName, tagLine, region) {
  const [profile] = await Promise.all([
    loadProfile(client, {
      gameName, tagLine, region, pageSize: MATCH_PAGE,
      extra: account => ({ mastery: client.get(`/mastery/${account.puuid}`, region) }),   // opcional
    }),
    ensureLolAssets(),
  ]);
  return profile;
}

// Siguiente página de partidas a partir de `start`
export const getMoreMatches = (puuid, start, region, count = MATCH_PAGE) =>
  loadMatchPage(client, puuid, region, start, count);

// Rotación semanal gratuita: { free: [ids], newPlayers: [ids] }
export const getRotation = region => client.get("/rotation", region);

// Estado del servidor: { name, maintenances: [{ title, status }], incidents: [{ title, severity }] }
export const getStatus = region => client.get("/status", region, { lang: activeLanguage() });

// Partida en curso: { inGame: false } o { inGame: true, queueId, startTime, bans, participants: [...] }
export const getLive = (puuid, region) => client.get(`/live/${puuid}`, region);

// Ranking de una región: { players: [{ puuid, gameName, tagLine, leaguePoints, wins, losses }], total }
// tier: challenger | grandmaster | master; queue: RANKED_SOLO_5x5 | RANKED_FLEX_SR; limit hasta 50 por página
// Línea de tiempo de una partida terminada (oro por minuto y compras de objetos; ver server/lib/timeline.js)
export const getTimeline = async matchId => (await api.get(`/lol/match/${matchId}/timeline`)).data;

export async function getLeaderboard(region, { tier = "challenger", queue = "RANKED_SOLO_5x5", start = 0, limit = 10 } = {}) {
  const r = await api.get("/lol/leaderboard", { params: { region, tier, queue, start, limit } });
  return { players: r.data || [], total: Number(r.headers?.["x-total-count"]) || null };
}
