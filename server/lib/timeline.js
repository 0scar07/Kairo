// Línea de tiempo de una partida (match-v5 /timeline) reducida a lo que dibuja la web: el oro, la experiencia y el
// farmeo de cada jugador minuto a minuto y los objetivos grandes. La respuesta de Riot pesa cientos de KB; esta, pocos.

// Objetivos que se marcan en el gráfico
const MONSTERS = { DRAGON: "dragon", BARON_NASHOR: "baron", RIFTHERALD: "herald", HORDE: "grubs", ATAKHAN: "atakhan" };
const BUILDINGS = { TOWER_BUILDING: "tower", INHIBITOR_BUILDING: "inhibitor" };

/** Equipo contrario (100 <-> 200) */
const enemyOf = teamId => (teamId === 100 ? 200 : teamId === 200 ? 100 : null);

function reduceTimeline(raw) {
  const info = raw?.info || {};
  // Riot numera a los jugadores del 1 al 10; los puuid salen de metadata o de info.participants
  const puuids = (info.participants || []).length
    ? [...info.participants].sort((a, b) => a.participantId - b.participantId).map(p => p.puuid)
    : raw?.metadata?.participants || [];
  const ids = puuids.map((_, i) => String(i + 1));

  const frames = (info.frames || []).map(f => {
    const pf = f.participantFrames || {};
    return {
      t: Math.round((f.timestamp || 0) / 60_000),
      gold: ids.map(id => pf[id]?.totalGold ?? 0),
      xp: ids.map(id => pf[id]?.xp ?? 0),
      cs: ids.map(id => (pf[id]?.minionsKilled ?? 0) + (pf[id]?.jungleMinionsKilled ?? 0)),
    };
  });

  const events = [];
  for (const f of info.frames || []) {
    for (const e of f.events || []) {
      if (e.type === "ELITE_MONSTER_KILL" && MONSTERS[e.monsterType]) {
        events.push({ t: e.timestamp, type: MONSTERS[e.monsterType], team: e.killerTeamId ?? null, sub: e.monsterSubType || null });
      } else if (e.type === "BUILDING_KILL" && BUILDINGS[e.buildingType]) {
        // teamId es el dueño de la estructura: el objetivo se lo lleva el otro equipo
        events.push({ t: e.timestamp, type: BUILDINGS[e.buildingType], team: enemyOf(e.teamId) });
      }
    }
  }

  return { puuids, interval: info.frameInterval || 60_000, frames, events };
}

module.exports = { reduceTimeline };
