import AsyncStorage from "@react-native-async-storage/async-storage";
import { LOL_WEEK_KEY } from "../../constants/config";
import { findMe } from "./utils";

/**
 * La semana de LoL de Mi perfil: el objetivo de la semana y el resumen tipo "Wrapped".
 * Riot no da el historial de LP, así que la app guarda una foto diaria del rango Solo/Dúo cada vez que se abre Mi
 * perfil (solo en el celular). Con esas fotos y las partidas cargadas se calcula todo lo demás.
 *
 * Almacén: { snaps: { [puuid]: [{ day: "2026-10-20", score }] }, goals: {...}, done: { [puuid]: { [semana]: [ids] } } }
 */
const DAY_MS = 86_400_000;
const MAX_SNAPS = 21;
const RANKED = [420, 440];

export const DEFAULT_GOALS = { featured: "lp", lp: 50, wins: 5, winsOf: 10, kda: 3 };
export const GOAL_OPTIONS = { lp: [25, 50, 100, 150], wins: [3, 5, 7], kda: [2.5, 3, 4] };

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISION = { IV: 0, III: 1, II: 2, I: 3 };

// Puntos de liga en una sola escala: 400 por nivel, 100 por división y el LP encima (Master en adelante, solo LP)
export function rankScore(entry) {
  const t = TIERS.indexOf(entry?.tier);
  if (t < 0) return null;
  return t >= 7 ? 2800 + entry.leaguePoints : t * 400 + (DIVISION[entry.rank] ?? 0) * 100 + entry.leaguePoints;
}

// "2026-10-20" en la hora del celular
export const dayKey = (ms = Date.now()) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Lunes a las 00:00 (hora del celular) de la semana de `ms`
export function weekStart(ms = Date.now()) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

async function read() {
  try {
    return JSON.parse((await AsyncStorage.getItem(LOL_WEEK_KEY)) || "{}");
  } catch (e) {
    console.warn("Semana de LoL ilegible:", e.message);
    return {};
  }
}
const write = state => AsyncStorage.setItem(LOL_WEEK_KEY, JSON.stringify(state));

export async function loadWeekState(puuid) {
  const s = await read();
  return { snaps: s.snaps?.[puuid] || [], goals: { ...DEFAULT_GOALS, ...s.goals }, done: s.done?.[puuid] || {} };
}

// Guarda (o actualiza) la foto de hoy del rango Solo/Dúo
export async function recordSnapshot(puuid, solo, now = Date.now()) {
  const score = rankScore(solo);
  if (!puuid || score == null) return;
  const s = await read();
  const today = dayKey(now);
  const list = (s.snaps?.[puuid] || []).filter(x => x.day !== today);
  list.push({ day: today, score });
  await write({ ...s, snaps: { ...s.snaps, [puuid]: list.sort((a, b) => a.day.localeCompare(b.day)).slice(-MAX_SNAPS) } });
}

export async function saveGoals(goals) {
  const s = await read();
  await write({ ...s, goals: { ...DEFAULT_GOALS, ...goals } });
}

// Marca un objetivo como cumplido esta semana (el confeti sale una sola vez)
export async function markDone(puuid, week, id) {
  const s = await read();
  const mine = s.done?.[puuid] || {};
  const list = mine[week] || [];
  if (list.includes(id)) return false;
  const recent = Object.fromEntries(Object.entries({ ...mine, [week]: [...list, id] }).sort().slice(-4));
  await write({ ...s, done: { ...s.done, [puuid]: recent } });
  return true;
}

/** LP ganados (o perdidos) desde `since`: la foto más reciente antes de ese momento, o la primera después */
export function lpChange(snaps, since, current) {
  if (current == null || !snaps?.length) return null;
  const cut = dayKey(since);
  const before = snaps.filter(x => x.day < cut);
  const base = before.length ? before[before.length - 1] : snaps.find(x => x.day >= cut);
  return base ? current - base.score : null;
}

const kdaOf = p => (p.deaths === 0 ? p.kills + p.assists : (p.kills + p.assists) / p.deaths);

/** Partidas desde `since`, de la más vieja a la más nueva, con lo que necesitan el objetivo y el resumen */
export function gamesSince(matches, puuid, since) {
  return (matches || [])
    .map(m => {
      const me = findMe(m, puuid);
      const at = m.info?.gameEndTimestamp || m.info?.gameCreation || 0;
      if (!me || at < since || (m.info?.gameDuration || 0) < 300) return null;   // sin partidas repetidas
      return {
        id: m.metadata.matchId, at, win: me.win, queueId: m.info.queueId, ranked: RANKED.includes(m.info.queueId),
        champion: me.championName, kills: me.kills, deaths: me.deaths, assists: me.assists, kda: kdaOf(me),
        damage: me.totalDamageDealtToChampions || 0, role: me.teamPosition || me.individualPosition || null,
        cs: (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0), minutes: (m.info.gameDuration || 0) / 60,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);
}

/** Los 7 días de la semana (lunes a domingo): "win" | "loss" | "even" | "none" | "future" */
export function weekDays(games, start, now = Date.now()) {
  return Array.from({ length: 7 }, (_, i) => {
    const from = start + i * DAY_MS, to = from + DAY_MS;
    if (from > now) return "future";
    const day = games.filter(g => g.at >= from && g.at < to);
    if (!day.length) return "none";
    const w = day.filter(g => g.win).length, l = day.length - w;
    return w > l ? "win" : l > w ? "loss" : "even";
  });
}

/**
 * Avance de un objetivo: { id, value, target, pct (0-1), done, failed }
 *  - lp: LP ganados en la semana (Solo/Dúo)
 *  - wins: victorias en clasificatorias, como "gana 5 de 10" (falla si ya jugó las 10 sin llegar)
 *  - kda: KDA medio de la semana (cuenta desde 3 partidas)
 */
export function goalProgress(id, goals, { lp, games }) {
  if (id === "lp") {
    const target = goals.lp;
    const value = lp ?? 0;
    return { id, value, target, pct: Math.min(Math.max(value / target, 0), 1), done: value >= target, failed: false, unknown: lp == null };
  }
  if (id === "wins") {
    const ranked = games.filter(g => g.ranked).slice(0, goals.winsOf);
    const value = ranked.filter(g => g.win).length;
    const target = goals.wins;
    return { id, value, target, of: goals.winsOf, played: ranked.length, pct: Math.min(value / target, 1), done: value >= target, failed: value < target && ranked.length >= goals.winsOf };
  }
  const k = games.length ? games.reduce((a, g) => a + g.kda, 0) / games.length : 0;
  const value = Math.round(k * 10) / 10;
  const target = goals.kda;
  return { id, value, target, played: games.length, pct: games.length < 3 ? 0 : Math.min(value / target, 1), done: games.length >= 3 && value >= target, failed: false };
}

/** Resumen de los últimos 7 días para la historia "Tu semana" (null si jugó menos de 3 partidas) */
export function weekRecap(games, lp) {
  if (games.length < 3) return null;
  const wins = games.filter(g => g.win).length;
  const byChamp = new Map();
  for (const g of games) {
    const c = byChamp.get(g.champion) || { name: g.champion, games: 0, wins: 0, kda: 0 };
    c.games++; if (g.win) c.wins++; c.kda += g.kda;
    byChamp.set(g.champion, c);
  }
  const top = [...byChamp.values()].sort((a, b) => b.games - a.games || b.wins - a.wins)[0];
  const best = [...games].sort((a, b) => Number(b.win) - Number(a.win) || b.kda - a.kda || b.damage - a.damage)[0];
  let streak = 0, run = 0;
  for (const g of games) { run = g.win ? run + 1 : 0; streak = Math.max(streak, run); }
  const roles = new Map();
  for (const g of games) if (g.role && g.role !== "Invalid") roles.set(g.role, (roles.get(g.role) || 0) + 1);
  const role = [...roles].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return {
    games: games.length, wins, losses: games.length - wins, wr: Math.round((wins / games.length) * 100), lp,
    top: { ...top, wr: Math.round((top.wins / top.games) * 100), kda: Math.round((top.kda / top.games) * 10) / 10 },
    best, streak, role, from: games[0].at, to: games[games.length - 1].at,
  };
}
