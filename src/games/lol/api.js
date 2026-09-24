import { createGameClient, loadProfile, loadMatchPage } from "../../api/client";

export const MATCH_PAGE = 10;

const client = createGameClient("lol");

// Perfil completo de un jugador de LoL: cuenta, invocador, rango y primeras partidas
export const searchPlayer = (gameName, tagLine, region) =>
  loadProfile(client, { gameName, tagLine, region, pageSize: MATCH_PAGE });

// Siguiente página de partidas a partir de `start`
export const getMoreMatches = (puuid, start, region, count = MATCH_PAGE) =>
  loadMatchPage(client, puuid, region, start, count);
