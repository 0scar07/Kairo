// Esports de LoL (ligas profesionales): funciones puras para transformar lo que devuelven la API de lolesports.com
// y el feed de estadísticas en vivo (feed.lolesports.com) en lo que muestra la app. Sin red, para poder probarlas.

// Ligas que ofrece la app, en este orden (slug de lolesports -> nombre corto)
const LEAGUES = [
  { slug: "lck", short: "LCK" },
  { slug: "lpl", short: "LPL" },
  { slug: "lec", short: "LEC" },
  { slug: "lcs", short: "LCS" },
  { slug: "lta_n", short: "LTA Norte" },
  { slug: "lta_s", short: "LTA Sur" },
  { slug: "lla", short: "LLA" },
  { slug: "worlds", short: "Mundial" },
  { slug: "msi", short: "MSI" },
];

const https = url => (url ? String(url).replace(/^http:\/\//, "https://") : null);

/** getLeagues -> las ligas de la app con id, nombre y logo (las que lolesports ya no tenga se omiten) */
function pickLeagues(leagues) {
  const bySlug = new Map((leagues || []).map(l => [l.slug, l]));
  return LEAGUES.filter(l => bySlug.has(l.slug)).map(l => {
    const src = bySlug.get(l.slug);
    return { id: src.id, slug: l.slug, name: src.name, short: l.short, region: src.region || null, image: https(src.image) };
  });
}

/** getTournamentsForLeague -> torneos del más reciente al más antiguo (los que aún no empiezan, al final) */
function pickTournaments(tournaments, now = Date.now()) {
  return (tournaments || [])
    .map(t => ({ id: t.id, slug: t.slug, startDate: t.startDate, endDate: t.endDate }))
    .sort((a, b) => {
      const fa = Date.parse(a.startDate) > now, fb = Date.parse(b.startDate) > now;
      if (fa !== fb) return fa ? 1 : -1;
      return Date.parse(b.startDate) - Date.parse(a.startDate);
    });
}

/**
 * getStandings -> una tabla por sección (grupos o liga regular) con puesto, equipo y récord.
 * Las fases de eliminatorias no traen tabla: se omiten. Si un equipo aparece en varias secciones, cuenta la primera.
 */
function pickStandings(standings) {
  const sections = [];
  for (const stage of standings?.[0]?.stages || []) {
    for (const sec of stage.sections || []) {
      const rows = [];
      for (const r of sec.rankings || []) {
        for (const tm of r.teams || []) {
          rows.push({
            position: r.ordinal,
            id: tm.id, slug: tm.slug, name: tm.name, code: tm.code, image: https(tm.image),
            wins: tm.record?.wins ?? 0, losses: tm.record?.losses ?? 0,
          });
        }
      }
      if (rows.length) sections.push({ name: sec.name || stage.name, stage: stage.name, rows });
    }
  }
  return sections;
}

const ROLE_ORDER = ["top", "jungle", "mid", "bottom", "support"];

/** getTeams -> equipo con su roster ordenado por rol (titulares de lolesports primero, sin "none") */
function pickTeam(team) {
  if (!team) return null;
  const players = (team.players || [])
    .filter(p => p && p.id)
    .map(p => ({
      id: String(p.id),
      name: p.summonerName,
      firstName: p.firstName || null,
      lastName: p.lastName || null,
      role: ROLE_ORDER.includes(p.role) ? p.role : null,
      image: p.image && !/default-headshot/.test(p.image) ? https(p.image) : null,
    }))
    .sort((a, b) => (ROLE_ORDER.indexOf(a.role) + 1 || 99) - (ROLE_ORDER.indexOf(b.role) + 1 || 99));
  return {
    id: team.id, slug: team.slug, name: team.name, code: team.code, image: https(team.image),
    league: team.homeLeague?.name || null, players,
  };
}

/**
 * Partidas jugadas por un equipo en los eventos completados de un torneo:
 *  [{ matchId, gameIds, teamWins, rivalWins, rival: { code, name, image }, startTime }]
 * El equipo se reconoce por su código (T1, GEN…) o por su nombre.
 */
function teamSeries(events, team) {
  const isTeam = t => t && ((team.code && t.code === team.code) || (team.name && t.name === team.name));
  const out = [];
  for (const e of events || []) {
    const teams = e.match?.teams || [];
    const me = teams.find(isTeam);
    if (!me) continue;
    const rival = teams.find(t => t !== me) || null;
    out.push({
      matchId: e.match.id,
      startTime: e.startTime,
      gameIds: (e.games || []).map(g => g.id),
      teamWins: me.result?.gameWins ?? 0,
      rivalWins: rival?.result?.gameWins ?? 0,
      rival: rival ? { code: rival.code, name: rival.name, image: https(rival.image) } : null,
    });
  }
  return out;
}

/**
 * Resumen de una partida terminada a partir del feed (primer fotograma de `window`, último de `window` y último de
 * `details`): duración, lado de cada equipo, quién parece haber ganado (más inhibidores, torres y oro) y lo que hizo
 * cada jugador. null si la partida no se jugó o no terminó.
 */
function reduceGame({ first, last, details }) {
  const meta = first?.gameMetadata;
  const lastFrame = last?.frames?.[last.frames.length - 1];
  const firstFrame = first?.frames?.[0];
  const detailFrame = details?.frames?.[details.frames.length - 1];
  if (!meta || !lastFrame || lastFrame.gameState !== "finished" || !firstFrame || !detailFrame) return null;

  const seconds = Math.max(1, Math.round((Date.parse(lastFrame.rfc460Timestamp) - Date.parse(firstFrame.rfc460Timestamp)) / 1000));
  const score = team => [team.inhibitors || 0, team.towers || 0, team.totalGold || 0];
  const [b, r] = [score(lastFrame.blueTeam), score(lastFrame.redTeam)];
  const blueAhead = b[0] !== r[0] ? b[0] > r[0] : b[1] !== r[1] ? b[1] > r[1] : b[2] >= r[2];

  const byId = new Map((detailFrame.participants || []).map(p => [p.participantId, p]));
  const side = (teamMeta, sideName, teamKills) => (teamMeta?.participantMetadata || []).map(pm => {
    const d = byId.get(pm.participantId) || {};
    return {
      playerId: pm.esportsPlayerId ? String(pm.esportsPlayerId) : null,
      champion: pm.championId,
      role: pm.role || null,
      side: sideName,
      kills: d.kills || 0, deaths: d.deaths || 0, assists: d.assists || 0,
      gold: d.totalGoldEarned || 0, cs: d.creepScore || 0,
      damageShare: typeof d.championDamageShare === "number" ? d.championDamageShare : null,
      teamKills,
    };
  });

  return {
    seconds,
    patch: meta.patchVersion || null,
    blueTeamId: meta.blueTeamMetadata?.esportsTeamId ? String(meta.blueTeamMetadata.esportsTeamId) : null,
    redTeamId: meta.redTeamMetadata?.esportsTeamId ? String(meta.redTeamMetadata.esportsTeamId) : null,
    blueAhead,
    players: [
      ...side(meta.blueTeamMetadata, "blue", lastFrame.blueTeam.totalKills || 0),
      ...side(meta.redTeamMetadata, "red", lastFrame.redTeam.totalKills || 0),
    ],
  };
}

/**
 * Quién ganó cada partida de una serie. El marcador de la serie es exacto y la última partida siempre la gana el
 * ganador de la serie; el orden de las anteriores se deduce del estado final de cada partida (`blueAhead`) y se
 * ajusta para que el total coincida con el marcador. Devuelve [true|false] (ganó el equipo) por partida jugada.
 */
function seriesResults(games, teamId, teamWins) {
  const played = games.filter(Boolean);
  if (!played.length) return [];
  const guess = played.map(g => (g.blueTeamId === teamId ? g.blueAhead : !g.blueAhead));
  const wonSeries = teamWins > played.length - teamWins;
  guess[guess.length - 1] = wonSeries;
  // Ajuste al marcador: si sobran o faltan victorias, se corrigen las partidas desde la penúltima hacia atrás
  let diff = guess.filter(Boolean).length - teamWins;
  for (let i = guess.length - 2; i >= 0 && diff !== 0; i--) {
    if (diff > 0 && guess[i]) { guess[i] = false; diff--; }
    else if (diff < 0 && !guess[i]) { guess[i] = true; diff++; }
  }
  return guess;
}

/**
 * Estadísticas de cada jugador del roster en un torneo, a partir de las partidas del equipo:
 *  { [playerId]: { games, wins, kills, deaths, assists, kda, killParticipation, goldPerMin, csPerMin, damageShare,
 *                  champions: [{ name, games, wins, kills, deaths, assists }] } }
 * `seriesList`: [{ teamWins, games: [reduceGame…] }] (ver teamSeries + reduceGame)
 */
function rosterStats(seriesList, teamId) {
  const acc = {};
  for (const s of seriesList) {
    const results = seriesResults(s.games, teamId, s.teamWins);
    s.games.filter(Boolean).forEach((g, i) => {
      const won = results[i];
      const mySide = g.blueTeamId === teamId ? "blue" : g.redTeamId === teamId ? "red" : null;
      if (!mySide) return;
      for (const p of g.players.filter(x => x.side === mySide && x.playerId)) {
        const a = acc[p.playerId] || (acc[p.playerId] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, teamKills: 0, gold: 0, cs: 0, seconds: 0, damage: [], champs: {} });
        a.games++; if (won) a.wins++;
        a.kills += p.kills; a.deaths += p.deaths; a.assists += p.assists; a.teamKills += p.teamKills;
        a.gold += p.gold; a.cs += p.cs; a.seconds += g.seconds;
        if (p.damageShare != null) a.damage.push(p.damageShare);
        const c = a.champs[p.champion] || (a.champs[p.champion] = { name: p.champion, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 });
        c.games++; if (won) c.wins++; c.kills += p.kills; c.deaths += p.deaths; c.assists += p.assists;
      }
    });
  }
  const out = {};
  for (const [id, a] of Object.entries(acc)) {
    const minutes = a.seconds / 60;
    out[id] = {
      games: a.games, wins: a.wins, losses: a.games - a.wins,
      kills: a.kills, deaths: a.deaths, assists: a.assists,
      kda: a.deaths ? +((a.kills + a.assists) / a.deaths).toFixed(2) : null,   // null = KDA perfecto
      killParticipation: a.teamKills ? Math.round(((a.kills + a.assists) / a.teamKills) * 100) : null,
      goldPerMin: minutes ? Math.round(a.gold / minutes) : null,
      csPerMin: minutes ? +(a.cs / minutes).toFixed(1) : null,
      damageShare: a.damage.length ? Math.round((a.damage.reduce((x, y) => x + y, 0) / a.damage.length) * 100) : null,
      champions: Object.values(a.champs).sort((x, y) => y.games - x.games || y.wins - x.wins),
    };
  }
  return out;
}

/** getTeams (todos) -> índice "CODE|Nombre" y "CODE" -> { slug, id } para reconocer a los equipos de los eventos */
function teamIndex(teams) {
  const index = new Map();
  for (const t of teams || []) {
    if (!t?.slug || t.slug === "tbd") continue;
    const ref = { slug: t.slug, id: t.id };
    index.set(`${t.code}|${t.name}`, ref);
    if (!index.has(t.code)) index.set(t.code, ref);
  }
  return index;
}

/**
 * Torneos sin tabla (Mundial y MSI se juegan en formato suizo y eliminatorias): una tabla armada con las series
 * terminadas de cada equipo, ordenada por series ganadas y luego por diferencia de partidas.
 */
function standingsFromEvents(events, index) {
  const rows = new Map();
  for (const e of events || []) {
    const teams = e.match?.teams || [];
    if (teams.length !== 2) continue;
    const [a, b] = teams.map(t => ({ t, games: t.result?.gameWins ?? 0 }));
    if (a.games === b.games) continue;
    for (const [me, rival] of [[a, b], [b, a]]) {
      const key = `${me.t.code}|${me.t.name}`;
      const ref = index.get(key) || index.get(me.t.code);
      if (!ref) continue;
      const row = rows.get(ref.slug) || { id: ref.id, slug: ref.slug, name: me.t.name, code: me.t.code, image: https(me.t.image), wins: 0, losses: 0, diff: 0 };
      if (me.games > rival.games) row.wins++; else row.losses++;
      row.diff += me.games - rival.games;
      rows.set(ref.slug, row);
    }
  }
  const sorted = [...rows.values()].sort((x, y) => y.wins - x.wins || x.losses - y.losses || y.diff - x.diff);
  return sorted.length ? [{ name: "results", rows: sorted.map(({ diff, ...r }, i) => ({ ...r, position: i + 1 })) }] : [];
}

/** Marca de tiempo para pedir al feed el final de la partida: inicio + 90 min, redondeada a 10 s (lo exige el feed) */
function endTimestamp(startIso, minutes = 90) {
  const t = new Date(Date.parse(startIso) + minutes * 60_000);
  t.setUTCSeconds(Math.floor(t.getUTCSeconds() / 10) * 10, 0);
  return t.toISOString();
}

/**
 * Próxima partida oficial de un equipo en los calendarios (getSchedule) de las ligas: la primera que aún no termina,
 * reconociendo al equipo por su código o su nombre. Las que siguen "en curso" cuentan (se están jugando ahora).
 * -> { startTime, state, league: { slug, name }, block, bestOf, opponent: { code, name, image } } o null
 */
function nextMatch(events, team, now = Date.now()) {
  const same = t => t && ((team.code && t.code === team.code) || (team.name && t.name === team.name));
  const list = (events || [])
    .filter(e => e && e.type !== "show" && e.state !== "completed" && e.match && (e.match.teams || []).some(same))
    .filter(e => e.state === "inProgress" || Date.parse(e.startTime) >= now - 3_600_000)
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const e = list[0];
  if (!e) return null;
  const rival = (e.match.teams || []).find(t => !same(t)) || {};
  return {
    startTime: e.startTime,
    state: e.state,
    league: { slug: e.league?.slug || null, name: e.league?.name || null },
    block: e.blockName || null,
    bestOf: e.match.strategy?.type === "bestOf" ? e.match.strategy.count : null,
    opponent: { code: rival.code || null, name: rival.name || null, image: rival.image ? https(rival.image) : null },
  };
}

module.exports = { nextMatch, LEAGUES, pickLeagues, pickTournaments, pickStandings, pickTeam, teamSeries, reduceGame, seriesResults, rosterStats, teamIndex, standingsFromEvents, endTimestamp };
