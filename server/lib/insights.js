// Datos para las etiquetas de la partida en vivo (las arma la web: "Main de Jinx", "OTP", "Primera vez con…").
// Todo puro (sin red) para poder probarlo fácil; la ruta (routes/lol.js) pide la maestría completa de cada jugador.

/**
 * Resume la maestría completa de un jugador (champion-mastery-v4 /by-puuid) respecto al campeón que juega:
 *   champion       maestría con ese campeón ({ level, points, lastPlayTime }) o null si nunca lo jugó
 *   position       puesto de ese campeón en su maestría (1 = el que más puntos tiene) o null
 *   top            sus 3 campeones con más puntos ({ championId, points })
 *   totalPoints    suma de puntos de todos sus campeones
 *   championsPlayed cuántos campeones distintos tiene con puntos
 */
function masterySummary(list, championId) {
  const sorted = (Array.isArray(list) ? list : [])
    .filter(m => m && Number.isFinite(m.championId))
    .sort((a, b) => (b.championPoints || 0) - (a.championPoints || 0));
  const index = sorted.findIndex(m => m.championId === championId);
  const mine = index >= 0 ? sorted[index] : null;
  return {
    champion: mine ? { level: mine.championLevel ?? 0, points: mine.championPoints ?? 0, lastPlayTime: mine.lastPlayTime ?? null } : null,
    position: index >= 0 ? index + 1 : null,
    top: sorted.slice(0, 3).map(m => ({ championId: m.championId, points: m.championPoints ?? 0 })),
    totalPoints: sorted.reduce((sum, m) => sum + (m.championPoints || 0), 0),
    championsPlayed: sorted.filter(m => (m.championPoints || 0) > 0).length,
  };
}

module.exports = { masterySummary };
