// Normaliza la respuesta de Spectator-V5 (partida en curso) a lo que necesita la app.
// `ranks` es un mapa puuid -> entrada de Solo/Dúo (o null) obtenido aparte.

const SOLO_QUEUE = "RANKED_SOLO_5x5";

/** De la lista de entradas de league-v4 se queda con Solo/Dúo, sin campos que la app no usa. */
function soloEntry(entries) {
  const e = (entries || []).find(x => x.queueType === SOLO_QUEUE);
  return e
    ? { tier: e.tier, rank: e.rank, leaguePoints: e.leaguePoints, wins: e.wins, losses: e.losses }
    : null;
}

function normalizeLive(game, ranks = {}) {
  const participants = (game.participants || []).map(p => {
    const styles = p.perks?.perkIds || [];
    return {
      puuid: p.puuid || null,
      riotId: p.riotId || null,
      teamId: p.teamId,
      championId: p.championId,
      profileIconId: p.profileIconId ?? null,
      spell1Id: p.spell1Id,
      spell2Id: p.spell2Id,
      keystone: styles[0] ?? null,          // primera runa de la lista = piedra angular
      secondary: p.perks?.perkSubStyle ?? null,
      bot: Boolean(p.bot),
      ranked: p.puuid ? ranks[p.puuid] ?? null : null,
    };
  });

  return {
    inGame: true,
    gameId: game.gameId,
    gameMode: game.gameMode,
    gameType: game.gameType,
    queueId: game.gameQueueConfigId ?? null,
    mapId: game.mapId ?? null,
    // 0 mientras carga la partida: la app muestra "Cargando partida" en vez del cronómetro
    startTime: game.gameStartTime > 0 ? game.gameStartTime : 0,
    length: game.gameLength || 0,
    bans: (game.bannedChampions || []).map(b => ({ championId: b.championId, teamId: b.teamId, pickTurn: b.pickTurn })),
    participants,
  };
}

module.exports = { normalizeLive, soloEntry };
