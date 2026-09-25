import { t } from "../../i18n";
import { colors } from "../../theme";
import { humanize, parseBattleTime } from "../../utils/supercell";

// Nivel que se ve en el juego: la API cuenta desde el nivel máximo de la rareza (comunes 16, épicas 11…)
// y el juego lo muestra en la misma escala para todas (hasta 16)
export const displayLevel = card => (card.level || 0) + Math.max(0, 16 - (card.maxLevel || 16));

// Tipo de batalla (el `type` de la API) -> clave de traducción; si no se conoce, se muestra tal cual
const KINDS = [
  "PvP", "pathOfLegend", "challenge", "tournament", "friendly", "clanMate", "boatBattle", "riverRacePvP",
  "riverRaceDuel", "riverRaceDuelColosseum", "trail", "casual1v1", "casual2v2", "clanWarWarDay",
];
export const kindLabel = type => (KINDS.includes(type) ? t(`cr.kind.${type}`) : humanize(type));

// Icono de una carta: la API lo trae en iconUrls
export const cardIcon = card => card?.iconUrls?.medium || null;

// Elixir promedio del mazo (una decimal); null si no hay costes
export function averageElixir(deck) {
  const costs = (deck || []).map(c => c.elixirCost).filter(n => typeof n === "number");
  return costs.length ? (costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(1) : null;
}

/**
 * Datos listos para mostrar de una batalla. El resultado se deduce de las coronas: team[0] contra opponent[0].
 */
export function battleView(item) {
  const me = item.team?.[0] || {};
  const rival = item.opponent?.[0] || {};
  const mine = me.crowns ?? 0;
  const theirs = rival.crowns ?? 0;
  const win = mine > theirs ? true : mine < theirs ? false : null;
  const result = win === true ? { label: t("results.victory"), color: colors.win }
    : win === false ? { label: t("results.defeat"), color: colors.loss }
    : { label: t("results.draw"), color: colors.textSecondary };

  return {
    result,
    win,
    score: `${mine} - ${theirs}`,
    rivalName: rival.name || t("cr.rival"),
    kind: kindLabel(item.type),
    trophyChange: typeof me.trophyChange === "number" ? me.trophyChange : null,
    time: parseBattleTime(item.battleTime),
  };
}
