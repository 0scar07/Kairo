import { createGameClient, loadProfile, loadMatchPage } from "../../api/client";
import { ensureTftAssets } from "./assets";

export const MATCH_PAGE = 10;

const client = createGameClient("tft");

// Perfil completo de un jugador de TFT. Espera a los datos de Data Dragon para que los íconos ya estén listos.
export async function searchPlayer(gameName, tagLine, region) {
  const [profile] = await Promise.all([
    loadProfile(client, { gameName, tagLine, region, pageSize: MATCH_PAGE }),
    ensureTftAssets(),
  ]);
  return profile;
}

export const getMoreMatches = (puuid, start, region, count = MATCH_PAGE) =>
  loadMatchPage(client, puuid, region, start, count);
