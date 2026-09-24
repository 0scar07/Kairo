import { createGameClient, loadProfile, loadMatchPage } from "../../api/client";
import { ensureLolAssets } from "./assets";

export const MATCH_PAGE = 10;

const client = createGameClient("lol");

// Perfil completo de un jugador de LoL: cuenta, invocador, rango y primeras partidas.
// Espera a los datos de runas y hechizos para que el detalle de partida ya tenga sus íconos.
export async function searchPlayer(gameName, tagLine, region) {
  const [profile] = await Promise.all([
    loadProfile(client, { gameName, tagLine, region, pageSize: MATCH_PAGE }),
    ensureLolAssets(),
  ]);
  return profile;
}

// Siguiente página de partidas a partir de `start`
export const getMoreMatches = (puuid, start, region, count = MATCH_PAGE) =>
  loadMatchPage(client, puuid, region, start, count);
