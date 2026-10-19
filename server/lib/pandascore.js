/**
 * Esports con PandaScore (Wild Rift y Valorant): partidos y torneos al formato de la app. PandaScore gratis da el
 * calendario, los resultados y los torneos, pero no las estadísticas de cada mapa ni sus nombres.
 */

function team(o) {
  const t = o?.opponent || o || {};
  return { id: t.id ?? null, name: t.name || null, acronym: t.acronym || null, image: t.image_url || null };
}

/** Partido de PandaScore al formato de la app */
function normalizeMatch(m) {
  const opponents = (m.opponents || []).map(team);
  const score = id => (m.results || []).find(r => r.team_id === id)?.score ?? null;
  // "Grand Final: LOUD vs VIT" → "Grand Final" (la fase dentro del torneo, si el nombre la trae)
  const stage = /^([^:]+):/.exec(m.name || "")?.[1]?.trim() || null;
  return {
    id: m.id,
    status: m.status,                                 // not_started | running | finished | canceled
    beginAt: m.begin_at || m.scheduled_at || null,
    bestOf: m.number_of_games || null,
    league: m.league ? { name: m.league.name, image: m.league.image_url || null } : null,
    tournament: m.tournament?.name || null,
    serie: m.serie?.full_name || m.serie?.name || null,
    stage,
    teams: opponents.map(t => ({ ...t, score: score(t.id) })),
    winnerId: m.winner_id ?? null,
    games: (m.games || []).map(g => ({ position: g.position, status: g.status, winnerId: g.winner?.id ?? null })),
    stream: (m.streams_list || []).find(s => s.main)?.raw_url || m.streams_list?.[0]?.raw_url || null,
  };
}

const CURRENCIES = { "United States Dollar": "USD", Euro: "EUR", "Chinese Yuan": "CNY", "Brazilian Real": "BRL", "Japanese Yen": "JPY", "South Korean Won": "KRW" };

/** "500000 United States Dollar" o "36,500 United States Dollar" → { amount: 500000, currency: "USD" } */
function prize(text) {
  const m = /^([\d.,]+)\s+(.+)$/.exec(String(text || "").trim());
  if (!m) return null;
  const amount = Number(m[1].replace(/[.,]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? { amount, currency: CURRENCIES[m[2]] || m[2] } : null;
}

function normalizeTournament(t) {
  return {
    id: t.id,
    name: [t.league?.name, t.serie?.full_name, t.name].filter(Boolean).join(" · "),
    league: t.league ? { name: t.league.name, image: t.league.image_url || null } : null,
    serie: t.serie?.full_name || t.serie?.name || null,
    stage: t.name || null,
    tier: t.tier || null,                             // s, a, b, c, d (importancia según PandaScore)
    beginAt: t.begin_at || null,
    endAt: t.end_at || null,
    teams: (t.teams || []).length || null,
    prizepool: t.prizepool || null,
    prize: prize(t.prizepool),
  };
}

module.exports = { team, normalizeMatch, normalizeTournament, prize };
