import { createSupercellClient } from "../../api/supercell";
import { GLOBAL_REGION, tagOf } from "../../utils/supercell";

const client = createSupercellClient("brawlstars");

// Perfil de un jugador de Brawl Stars. Las batallas son opcionales: si fallan, el perfil se muestra igual.
// La forma { account, region } es la que esperan las pantallas genéricas (puuid = tag).
export async function searchPlayer(_name, tagLine) {
  const tag = tagOf(tagLine);
  const [player, battles] = await Promise.all([
    client.player(tag),
    client.battles(tag).catch(e => { console.warn("Batallas de Brawl Stars no disponibles:", e.message); return []; }),
  ]);
  const playerTag = tagOf(player.tag);
  return {
    region: GLOBAL_REGION,
    account: { gameName: player.name, tagLine: playerTag, puuid: playerTag },
    player,
    battles,
  };
}
