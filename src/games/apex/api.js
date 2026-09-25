import { createGameApi } from "../../api/gameApi";

const client = createGameApi("apex");

// Perfil de un jugador de Apex Legends (nombre de EA / PlayStation / Xbox y plataforma elegida)
export async function searchPlayer(name, _tag, platform = "PC") {
  const player = await client.get(`/player/${encodeURIComponent(name)}`, { platform });
  return {
    region: platform,
    account: { gameName: player.global.name, tagLine: "", puuid: `${platform}:${player.global.uid}`, lookup: player.global.name },
    player,
    platform,
  };
}
