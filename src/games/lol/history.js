import { api } from "../../api/client";

// Historial de rango: el servidor guarda una foto diaria de Solo/Dúo y Flex (ver server/lib/rankTracker.js).
// Cada foto: { day: "2026-09-25", solo: { tier, rank, lp, wins, losses, score, promo } | null, flex: ... }

export const getRankHistory = async (puuid, region) => (await api.get(`/lol/history/${puuid}`, { params: { region, days: 180 } })).data.snapshots;

// Le avisa al servidor de estos jugadores para que siga guardando su historial (una vez al día por app)
export const touchRankHistory = items => api.post("/lol/history/touch", { items }).then(r => r.data);

const DAY_MS = 86_400_000;
const dayMs = day => Date.parse(`${day}T12:00:00Z`);

/** Puntos de una cola: [{ day, ms, score, entry }] ordenados por día, sin los días en que no estaba clasificado. */
export function seriesFor(snapshots, queue) {
  return (snapshots || [])
    .filter(s => s[queue] && Number.isFinite(s[queue].score))
    .map(s => ({ day: s.day, ms: dayMs(s.day), score: s[queue].score, entry: s[queue] }))
    .sort((a, b) => a.ms - b.ms);
}

/** Cambio de puntos respecto a hace `days` días: la foto más reciente que sea igual o anterior a esa fecha (o null). */
export function changeSince(series, days) {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const target = last.ms - days * DAY_MS;
  const older = [...series].reverse().find(p => p.ms <= target);
  return older ? last.score - older.score : null;
}

/** Escala vertical "bonita": múltiplos de 100 (una división) que cubren los puntos, con un mínimo de 2 divisiones. */
export function scaleFor(series) {
  const scores = series.map(p => p.score);
  let min = Math.floor((Math.min(...scores) - 30) / 100) * 100;
  let max = Math.ceil((Math.max(...scores) + 30) / 100) * 100;
  if (max - min < 200) max = min + 200;
  return { min: Math.max(0, min), max };
}

// Nivel al que pertenece un puntaje (múltiplos de 400): para poner el nombre en el eje
export const TIER_NAMES = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER"];
export const tierAt = score => TIER_NAMES[Math.min(Math.floor(score / 400), TIER_NAMES.length - 1)];
