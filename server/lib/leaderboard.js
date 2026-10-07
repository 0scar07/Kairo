// Clasificación (Challenger, Gran Maestro o Maestro): de la liga de league-v4 se quedan los N mejores por LP, con lo
// que muestra la web.
// Todo puro (sin red) para poder probarlo fácil; la ruta (routes/lol.js) agrega el Riot ID de cada jugador.

const QUEUES = new Set(["RANKED_SOLO_5x5", "RANKED_FLEX_SR"]);
const DEFAULT_QUEUE = "RANKED_SOLO_5x5";

const queueOf = value => (QUEUES.has(value) ? value : DEFAULT_QUEUE);

// Ligas con lista completa en league-v4 (las demás se piden por división y no tienen "los mejores")
const TIERS = { challenger: "challengerleagues", grandmaster: "grandmasterleagues", master: "masterleagues" };
const tierOf = value => (Object.prototype.hasOwnProperty.call(TIERS, String(value).toLowerCase()) ? String(value).toLowerCase() : "challenger");
const leaguePath = (tier, queue) => `/lol/league/v4/${TIERS[tierOf(tier)]}/by-queue/${queueOf(queue)}`;

/** Desde qué puesto empezar (paginación): 0 a 5000 */
const startOf = value => Math.min(Math.max(parseInt(value, 10) || 0, 0), 5000);

/** Límite pedido entre 1 y 50 (10 si no viene o no es un número) */
const limitOf = value => Math.min(Math.max(parseInt(value, 10) || 10, 1), 50);

/** Los `limit` primeros por LP desde el puesto `start`; a igual LP, más victorias primero. Descarta entradas sin puuid. */
function topEntries(entries, limit, start = 0) {
  return (entries || [])
    .filter(e => e && e.puuid)
    .sort((a, b) => (b.leaguePoints - a.leaguePoints) || (b.wins - a.wins))
    .slice(start, start + limit)
    .map(e => ({ puuid: e.puuid, leaguePoints: e.leaguePoints ?? 0, wins: e.wins ?? 0, losses: e.losses ?? 0 }));
}

/** Une las entradas con sus cuentas Riot (en el mismo orden); si una cuenta falló, ese jugador queda sin nombre */
function withRiotIds(top, accounts) {
  return top.map((e, i) => ({
    puuid: e.puuid,
    gameName: accounts[i]?.gameName ?? null,
    tagLine: accounts[i]?.tagLine ?? null,
    leaguePoints: e.leaguePoints,
    wins: e.wins,
    losses: e.losses,
  }));
}

module.exports = { queueOf, limitOf, tierOf, startOf, leaguePath, topEntries, withRiotIds, DEFAULT_QUEUE };
