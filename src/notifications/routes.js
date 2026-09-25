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
 */
export function openFromNotification(data) {
  if (!data || data.demo) return;
  if (data.type === "weekly" || data.type === "rank_change") {
    const id = splitRiotId(data.riotId);
    if (id && data.region) navigateWhenReady("Profile", { gameId: "lol", gameName: id.gameName, tagLine: id.tagLine, region: data.region });
    return;
  }
  if (data.type === "trophy_record") {
    if (data.game && data.puuid) navigateWhenReady("Profile", { gameId: data.game, gameName: "", tagLine: data.puuid, region: "global" });
    return;
  }
  if (data.puuid && data.puuid !== "demo" && data.region) navigateWhenReady("LiveGame", { puuid: data.puuid, region: data.region, riotId: data.riotId });
}
