import { t } from "../i18n";
import { GLOBAL_REGION, tagOf } from "./supercell";

// Datos para abrir el perfil de algo guardado (favorito, reciente o "Mi perfil").
// Los juegos que buscan por nombre pueden guardar un `lookup` (el ID interno) porque el nombre visible se repite.
export const profileTarget = item => ({
  gameId: item.gameId,
  gameName: item.lookup ?? item.gameName,
  tagLine: item.tagLine ?? "",
  region: item.region,
});

/**
 * Qué abrir al buscar `text` en un juego (lo comparten el buscador de Inicio y la pantalla Buscar):
 *  -> { error } con el texto a mostrar si el formato no vale,
 *  -> { screen, params } con la pantalla a abrir ("Profile" o "SearchResults").
 * region: región elegida (juegos de Riot); platform: plataforma elegida (juegos por nombre con plataformas)
 */
export function searchTarget(game, input, { region, platform }) {
  const text = input.trim();

  // Juegos de Supercell: se busca solo por el tag (#2PP0) y no hay regiones
  if (game.tagSearch) {
    const tag = tagOf(text);
    if (tag.length < 3) return { error: t("home.badTag") };
    return { screen: "Profile", params: { gameId: game.id, gameName: "", tagLine: tag, region: GLOBAL_REGION } };
  }

  // Juegos que se buscan por nombre (Dota 2, Fortnite, Apex, PUBG): una plataforma opcional y, en Dota 2, una lista de resultados
  if (game.search === "name") {
    if (text.length < 2) return { error: t("home.badName") };
    const target = { gameId: game.id, gameName: text, tagLine: "", region: platform || GLOBAL_REGION };
    if (game.searchResults && !/^\d+$/.test(text)) return { screen: "SearchResults", params: { gameId: game.id, query: text, region: target.region } };
    return { screen: "Profile", params: target };
  }

  const cut  = text.lastIndexOf("#");
  const name = (cut < 0 ? text : text.slice(0, cut)).trim();
  const tag  = cut < 0 ? "" : text.slice(cut + 1).trim();
  if (!name || !tag) return { error: t("home.badRiotId") };
  return { screen: "Profile", params: { gameId: game.id, gameName: name, tagLine: tag, region } };
}

// Texto de ejemplo del campo de búsqueda según cómo se busca en el juego
export function searchPlaceholder(game) {
  if (game.tagSearch) return t("home.placeholderTag");
  if (game.search === "name") return t(game.searchResults ? "home.placeholderNameOrId" : "home.placeholderName");
  return t("home.placeholderRiotId");
}
