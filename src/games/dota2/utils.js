import { t } from "../../i18n";

// Modos de juego de Dota 2 (game_mode de OpenDota); los nombres son los del propio juego
const MODES = {
  1: "All Pick", 2: "Captains Mode", 3: "Random Draft", 4: "Single Draft", 5: "All Random",
  12: "Least Played", 13: "Limited Heroes", 16: "Captains Draft", 17: "Balanced Draft",
  18: "Ability Draft", 20: "All Random Deathmatch", 21: "1v1 Mid", 22: "All Draft", 23: "Turbo", 24: "Mutation",
};
const RANKED_LOBBY = 7;

export function modeLabel(gameMode, lobbyType) {
  if (lobbyType === RANKED_LOBBY) return t("dota.ranked");
  return MODES[gameMode] || t("queue.other");
}

// rank_tier de OpenDota: decena = medalla (1 Herald … 8 Immortal), unidad = estrellas (1-5)
export function medalOf(rankTier) {
  if (!rankTier) return null;
  return { medal: Math.floor(rankTier / 10), stars: rankTier % 10 };
}

// "Legend 3", "Immortal #16" o "Immortal"
export function rankLabel(rankTier, leaderboardRank) {
  const m = medalOf(rankTier);
  if (!m) return t("dota.unranked");
  const name = t(`dota.medal.${m.medal}`);
  if (m.medal === 8) return leaderboardRank ? `${name} #${leaderboardRank}` : name;
  return m.stars ? `${name} ${m.stars}` : name;
}
