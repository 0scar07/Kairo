import { createSupercellClient } from "../../api/supercell";
import { GLOBAL_REGION, tagOf } from "../../utils/supercell";

const client = createSupercellClient("clashroyale");

// Perfil de un jugador de Clash Royale. Las batallas son opcionales: si fallan, el perfil se muestra igual.
export async function searchPlayer(_name, tagLine) {
  const tag = tagOf(tagLine);
  const [player, battles] = await Promise.all([
    client.player(tag),
    client.battles(tag).catch(e => { console.warn("Batallas de Clash Royale no disponibles:", e.message); return []; }),
  ]);
  const playerTag = tagOf(player.tag);
  return {
    region: GLOBAL_REGION,
    account: { gameName: player.name, tagLine: playerTag, puuid: playerTag },
    player,
    battles,
  };
}
