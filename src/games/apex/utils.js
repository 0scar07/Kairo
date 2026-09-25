import { t } from "../../i18n";

const TIERS = { rookie: "rookie", bronze: "bronze", silver: "silver", gold: "gold", platinum: "platinum", diamond: "diamond", master: "master", "apex predator": "predator" };

// "Platinum" + división 2 -> "Platino 2" (traducido). Master y Apex Predator no llevan división.
export function rankLabel(rank) {
  if (!rank || !rank.name) return t("apex.unranked");
  const key = TIERS[String(rank.name).toLowerCase()];
  const name = key ? t(`apex.tier.${key}`) : rank.name;
  return rank.division > 0 && key !== "master" && key !== "predator" ? `${name} ${rank.division}` : name;
}

// Totales que se muestran, en este orden, con su clave de traducción
export const TOTALS = [
  ["kills", "apex.kills"], ["damage", "apex.damage"], ["headshots", "apex.headshots"],
  ["games_played", "apex.games"], ["wins", "apex.wins"], ["kd", "apex.kd"],
];
