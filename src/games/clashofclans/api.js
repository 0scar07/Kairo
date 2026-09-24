import { createSupercellClient } from "../../api/supercell";
import { GLOBAL_REGION, tagOf } from "../../utils/supercell";

const client = createSupercellClient("clashofclans");

// Perfil de un jugador de Clash of Clans (este juego no tiene registro de batallas)
export async function searchPlayer(_name, tagLine) {
  const player = await client.player(tagOf(tagLine));
  const playerTag = tagOf(player.tag);
  return {
    region: GLOBAL_REGION,
    account: { gameName: player.name, tagLine: playerTag, puuid: playerTag },
    player,
  };
}
