import { createGameApi } from "../../api/gameApi";
import { ensureHeroes } from "./heroes";
import { GLOBAL_REGION } from "../../utils/supercell";
import { timeSince } from "../../utils/format";
import { t } from "../../i18n";

const client = createGameApi("dota2");

// Jugadores con ese nombre de Steam, para elegir el correcto (el nombre se repite mucho)
export async function findPlayers(query) {
  const { items } = await client.get("/search", { q: query });
  return items.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    subtitle: p.lastMatch ? t("dota.lastMatch", { time: timeSince(new Date(p.lastMatch).getTime()) }) : null,
  }));
}

// Perfil de un jugador por su ID de cuenta (o Steam64). La forma { account, region } es la que esperan las pantallas genéricas.
export async function searchPlayer(idOrName) {
  const [player] = await Promise.all([client.get(`/player/${encodeURIComponent(idOrName)}`), ensureHeroes()]);
  return {
    region: GLOBAL_REGION,
    account: { gameName: player.profile.name, tagLine: "", puuid: player.id, lookup: player.id },
    player,
  };
}
