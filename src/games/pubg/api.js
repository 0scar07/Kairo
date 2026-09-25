import { createGameApi } from "../../api/gameApi";

const client = createGameApi("pubg");

// Perfil de un jugador de PUBG: estadísticas de la temporada, clasificatorio y últimas partidas.
// El nombre es único por plataforma (Steam, PlayStation, Xbox, Kakao) y la plataforma la elige el usuario.
export async function searchPlayer(name, _tag, platform = "steam") {
  const player = await client.get(`/player/${encodeURIComponent(name)}`, { platform });
  return {
    region: platform,
    account: { gameName: player.player.name, tagLine: "", puuid: player.player.id, lookup: player.player.name },
    player,
    platform,
  };
}
