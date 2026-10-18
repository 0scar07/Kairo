import { t } from "../../i18n";

// CS = súbditos + monstruos de la jungla
export const csOf = p => (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);

// Riot ID (nombre#TAG) del participante; summonerName casi siempre viene vacío
export function playerName(p) {
  if (p.riotIdGameName) return `${p.riotIdGameName}#${p.riotIdTagline || "?"}`;
  return p.summonerName || p.championName || t("common.player");
}

// KDA como texto: "Perfect" si no hay muertes
export const kdaRatio = (kills, deaths, assists) =>
  deaths === 0 ? t("match.perfect") : ((kills + assists) / deaths).toFixed(2);

// idCola -> clave de traducción
const QUEUES = {
  400: "queue.normal", 430: "queue.normal", 490: "queue.normal", 480: "queue.swiftplay",
  420: "queue.solo", 440: "queue.flex",
  450: "queue.aram", 720: "queue.aramClash",
  700: "queue.clash",
  830: "queue.vsAi", 840: "queue.vsAi", 850: "queue.vsAi",
  900: "queue.urf", 1900: "queue.urf",
  1020: "queue.oneForAll", 1300: "queue.nexusBlitz", 1400: "queue.spellbook",
  1700: "queue.arena", 1710: "queue.arena",
};

export function queueLabel(queueId) {
  return t(QUEUES[queueId] || "queue.other");
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

export const QUEUE_SOLO = 420;
export const QUEUE_FLEX = 440;

// Los campeones con mejor winrate en una cola: a igual winrate gana el que tiene más partidas y luego mejor KDA
export function getBestChampions(matches, puuid, queueId, limit = 3) {
  const games = (matches || []).filter(m => m.info?.queueId === queueId);
  const kdaNum = c => (c.kda === t("match.perfect") ? Infinity : parseFloat(c.kda));
  return getChampionStats(games, puuid)
    .sort((a, b) => b.wr - a.wr || b.games - a.games || kdaNum(b) - kdaNum(a))
    .slice(0, limit);
}

// Ritmo y aporte en las partidas: totales de K/D/A, participación en kills (asesinatos + asistencias sobre los
// asesinatos del equipo), CS, daño, oro y visión por minuto, y duración media de las partidas (en segundos)
export function getPaceStats(matches, puuid) {
  let kills = 0, deaths = 0, assists = 0, teamKills = 0, cs = 0, damage = 0, gold = 0, vision = 0, seconds = 0, games = 0;
  (matches || []).forEach(m => {
    const me = findMe(m, puuid);
    if (!me || !m.info.gameDuration) return;
    kills += me.kills; deaths += me.deaths; assists += me.assists;
    teamKills += m.info.participants.filter(p => p.teamId === me.teamId).reduce((sum, p) => sum + (p.kills || 0), 0);
    cs += csOf(me);
    damage += me.totalDamageDealtToChampions || 0;
    gold += me.goldEarned || 0;
    vision += me.visionScore || 0;
    seconds += m.info.gameDuration;
    games++;
  });
  if (!games) return null;
  const minutes = seconds / 60;
  return {
    kills, deaths, assists,
    killParticipation: teamKills ? Math.round(((kills + assists) / teamKills) * 100) : null,
    csPerMin:  (cs / minutes).toFixed(1),
    dmgPerMin: Math.round(damage / minutes),
    goldPerMin: Math.round(gold / minutes),
    visionPerMin: (vision / minutes).toFixed(1),
    avgDuration: Math.round(seconds / games),
  };
}
