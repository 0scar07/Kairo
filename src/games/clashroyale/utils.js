import { colors } from "../../theme";
import { humanize, parseBattleTime } from "../../utils/supercell";

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
  const result = win === true ? { label: "VICTORIA", color: colors.win }
    : win === false ? { label: "DERROTA", color: colors.loss }
    : { label: "EMPATE", color: colors.textSecondary };

  return {
    result,
    win,
    score: `${mine} - ${theirs}`,
    rivalName: rival.name || "Rival",
    mode: item.gameMode?.name ? item.gameMode.name : humanize(item.type),
    kind: humanize(item.type),
    trophyChange: typeof me.trophyChange === "number" ? me.trophyChange : null,
    time: parseBattleTime(item.battleTime),
  };
}
