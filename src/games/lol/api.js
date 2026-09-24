import { createGameClient, loadProfile, loadMatchPage } from "../../api/client";
import { ensureLolAssets } from "./assets";

export const MATCH_PAGE = 10;

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
export const getStatus = region => client.get("/status", region);
