import { colors } from "../../theme";

const QUEUES = {
  1090: "Normal", 1100: "Ranked", 1130: "Hyper Roll", 1160: "Double Up",
  1170: "Fortune's Favor", 1210: "Modo especial", 1220: "Modo especial",
};
export const queueLabel = id => QUEUES[id] || "Otro modo";

// Posición final 1-8: podio, top 4 (verde) y eliminado antes (rojo)
export function placementColor(p) {
  if (p === 1) return colors.placement.first;
  if (p === 2) return colors.placement.second;
  if (p === 3) return colors.placement.third;
  if (p <= 4)  return colors.win;
  return colors.loss;
}

export function placementLabel(p) {
  if (p === 1) return "1er lugar";
  if (p <= 4)  return `Top ${p}`;
  return `${p}° lugar`;
}

// style: 0 inactivo, 1 bronce, 2 plata, 3 oro, 4 cromático
export const TRAIT_STYLE_COLORS = {
  1: colors.placement.third,
  2: colors.placement.second,
  3: colors.placement.first,
  4: colors.info,
};
export const traitColor = style => TRAIT_STYLE_COLORS[style] || colors.textFaint;

// Rasgos activos, los de mayor nivel primero
export const activeTraits = traits =>
  (traits || []).filter(t => t.style > 0).sort((a, b) => b.style - a.style || b.num_units - a.num_units);

// Costo (1-5) de una unidad: el de Data Dragon si existe; si no, se deduce de `rarity`
export function unitCost(unit, ddCost) {
  if (ddCost) return ddCost;
  const r = unit.rarity ?? 0;
  return r <= 2 ? r + 1 : r <= 4 ? 4 : 5;
}

export const findMe = (match, puuid) => match.info?.participants?.find(p => p.puuid === puuid);

export function participantName(p) {
  if (p.riotIdGameName) return `${p.riotIdGameName}#${p.riotIdTagline || "?"}`;
  return `Jugador ${p.placement}`;
}

export function getTftStats(matches, puuid) {
  const placements = (matches || []).map(m => findMe(m, puuid)?.placement).filter(p => p != null);
  const games = placements.length;
  if (!games) return null;
  return {
    games,
    avg:  (placements.reduce((a, p) => a + p, 0) / games).toFixed(1),
    top4: Math.round((placements.filter(p => p <= 4).length / games) * 100),
    wins: placements.filter(p => p === 1).length,
    placements,
  };
}
