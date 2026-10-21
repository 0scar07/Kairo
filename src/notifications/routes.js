import { Linking } from "react-native";
import { navigateWhenReady } from "../navigation/ref";

// "Nombre#TAG" -> { gameName, tagLine }
function splitRiotId(riotId) {
  const cut = String(riotId || "").lastIndexOf("#");
  return cut < 0 ? null : { gameName: riotId.slice(0, cut), tagLine: riotId.slice(cut + 1) };
}

/**
 * Abre la pantalla que corresponde al tocar una notificación (o su banner):
 *  - resumen semanal y cambios de rango -> el perfil del jugador
 *  - inicio y resultado de partida -> la partida en vivo
 *  - partida oficial de un pro seguido -> la pantalla del pro
 *  - parche nuevo -> las notas del parche dentro de la app (o la web si no es de Riot)
 *  - partido de un equipo de Valorant seguido -> el detalle del partido
 */
export function openFromNotification(data) {
  if (!data || data.demo) return;
  if (data.type === "weekly" || data.type === "rank_change") {
    const id = splitRiotId(data.riotId);
    if (id && data.region) navigateWhenReady("Profile", { gameId: "lol", gameName: id.gameName, tagLine: id.tagLine, region: data.region });
    return;
  }
  if (data.type === "pro_match") {
    if (data.slug && data.playerId) navigateWhenReady("ProPlayer", { slug: data.slug, playerId: data.playerId, leagueSlug: data.leagueSlug });
    return;
  }
  if (data.type === "patch") {
    if (data.game && data.path) navigateWhenReady("NewsArticle", { game: data.game, path: data.path });
    else if (data.url) Linking.openURL(data.url).catch(() => {});
    return;
  }
  if (data.type === "val_match") {
    if (data.id) navigateWhenReady("VALMatch", { id: data.id });
    return;
  }
  if (data.type === "trophy_record") {
    if (data.game && data.puuid) navigateWhenReady("Profile", { gameId: data.game, gameName: "", tagLine: data.puuid, region: "global" });
    return;
  }
  if (data.puuid && data.puuid !== "demo" && data.region) navigateWhenReady("LiveGame", { puuid: data.puuid, region: data.region, riotId: data.riotId });
}
