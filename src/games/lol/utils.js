// CS = súbditos + monstruos de la jungla
export const csOf = p => (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);

// Riot ID (nombre#TAG) del participante; summonerName casi siempre viene vacío
export function playerName(p) {
  if (p.riotIdGameName) return `${p.riotIdGameName}#${p.riotIdTagline || "?"}`;
  return p.summonerName || p.championName || "Jugador";
}

// KDA como texto: "Perfect" si no hay muertes
export const kdaRatio = (kills, deaths, assists) =>
  deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2);

const QUEUES = {
  400: "Normal", 430: "Normal", 490: "Normal", 480: "Swiftplay",
  420: "Solo/Dúo", 440: "Flex",
  450: "ARAM", 720: "ARAM Clash",
  700: "Clash",
  830: "Vs. IA", 840: "Vs. IA", 850: "Vs. IA",
  900: "URF", 1900: "URF",
  1020: "Un solo campeón", 1300: "Nexus Blitz", 1400: "Libro de hechizos",
  1700: "Arena", 1710: "Arena",
};

export function queueLabel(queueId) {
  return QUEUES[queueId] || "Otro modo";
}

// ─── Estadísticas de LoL a partir de las partidas ────────────────────────────
export const findMe = (match, puuid) =>
  match.info?.participants?.find(p => p.puuid === puuid);

export function getChampionStats(matches, puuid) {
  const stats = {};
  matches.forEach(m => {
    const me = findMe(m, puuid);
    if (!me) return;
    const c = me.championName;
    if (!stats[c]) stats[c] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, damage: 0 };
    stats[c].games++;
    if (me.win) stats[c].wins++;
    stats[c].kills   += me.kills;
    stats[c].deaths  += me.deaths;
    stats[c].assists += me.assists;
    stats[c].damage  += me.totalDamageDealtToChampions;
  });
  return Object.entries(stats)
    .map(([name, s]) => ({
      name,
      games:   s.games,
      wr:      Math.round((s.wins / s.games) * 100),
      kda:     kdaRatio(s.kills, s.deaths, s.assists),
      kills:   (s.kills   / s.games).toFixed(1),
      deaths:  (s.deaths  / s.games).toFixed(1),
      assists: (s.assists / s.games).toFixed(1),
      avgDmg:  Math.round(s.damage / s.games),
    }))
    .sort((a, b) => b.games - a.games);
}

export function getOverallStats(matches, puuid) {
  if (!matches?.length) return null;
  let wins = 0, kills = 0, deaths = 0, assists = 0, games = 0;
  matches.forEach(m => {
    const me = findMe(m, puuid);
    if (!me) return;
    games++;
    if (me.win) wins++;
    kills   += me.kills;
    deaths  += me.deaths;
    assists += me.assists;
  });
  if (!games) return null;
  return {
    games, wr: Math.round((wins / games) * 100),
    wins, losses: games - wins,
    kda:        kdaRatio(kills, deaths, assists),
    avgKills:   (kills   / games).toFixed(1),
    avgDeaths:  (deaths  / games).toFixed(1),
    avgAssists: (assists / games).toFixed(1),
  };
}

export function getStreak(matches, puuid) {
  if (!matches?.length) return null;
  const first = findMe(matches[0], puuid);
  if (!first) return null;
  const isWin = first.win;
  let count = 0;
  for (const m of matches) {
    const me = findMe(m, puuid);
    if (!me || me.win !== isWin) break;
    count++;
  }
  if (count < 2) return null;
  return { isWin, count };
}
