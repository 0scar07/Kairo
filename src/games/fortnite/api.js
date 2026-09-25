import { createGameApi } from "../../api/gameApi";

const client = createGameApi("fortnite");

// Estadísticas de un jugador de Fortnite (batalla campal). El nombre es el de Epic / PlayStation / Xbox y la plataforma la elige el usuario.
export async function searchPlayer(name, _tag, platform = "epic") {
  const player = await client.get(`/player/${encodeURIComponent(name)}`, { platform });
  return {
    region: platform,
    account: { gameName: player.account.name, tagLine: "", puuid: `${platform}:${player.account.id}`, lookup: player.account.name },
    player,
    platform,
  };
}
