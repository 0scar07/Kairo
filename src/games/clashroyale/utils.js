import { colors } from "../../theme";
import { humanize, parseBattleTime } from "../../utils/supercell";

// Nivel que se ve en el juego: la API cuenta desde el nivel máximo de la rareza (comunes 16, épicas 11…)
// y el juego lo muestra en la misma escala para todas (hasta 16)
export const displayLevel = card => (card.level || 0) + Math.max(0, 16 - (card.maxLevel || 16));

// Tipo de batalla en español (el `type` de la API); si no lo conocemos, se muestra tal cual
const KINDS = {
  PvP: "Escalera", pathOfLegend: "Senda de leyendas", challenge: "Desafío", tournament: "Torneo", friendly: "Amistoso",
  clanMate: "Amistoso de clan", boatBattle: "Batalla naval", riverRacePvP: "Guerra fluvial", riverRaceDuel: "Guerra fluvial: duelo",
  riverRaceDuelColosseum: "Guerra fluvial: coliseo", trail: "Camino", casual1v1: "Casual 1v1", casual2v2: "Casual 2v2", clanWarWarDay: "Guerra de clanes",
};
export const kindLabel = type => KINDS[type] || humanize(type);

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
    kind: kindLabel(item.type),
    trophyChange: typeof me.trophyChange === "number" ? me.trophyChange : null,
    time: parseBattleTime(item.battleTime),
  };
}
