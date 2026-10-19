import { createGameApi } from "../../api/gameApi";
import { activeLanguage } from "../../i18n";

const client = createGameApi("valorant");

export const getEsports = () => client.get("/esports");
export const getMatch = id => client.get(`/match/${id}`);

// Fechas y horas en el idioma y la zona horaria del teléfono
export const fmtTime = iso => new Date(iso).toLocaleTimeString(activeLanguage(), { hour: "2-digit", minute: "2-digit" });
export const fmtDay = iso => new Date(iso).toLocaleDateString(activeLanguage(), { weekday: "short", day: "numeric", month: "short" });
export const fmtWeekday = iso => new Date(iso).toLocaleDateString(activeLanguage(), { weekday: "short", day: "numeric" });
export const fmtShort = iso => new Date(iso).toLocaleDateString(activeLanguage(), { day: "numeric", month: "short" });
export const fmtDate = iso => new Date(iso).toLocaleDateString(activeLanguage(), { day: "numeric", month: "long" });
export const dayKey = iso => (iso ? new Date(iso).toDateString() : "");

/** Premio legible: { amount: 500000, currency: "USD" } → "500.000 USD" (con el separador del idioma) */
export const fmtPrize = p => (p ? `${p.amount.toLocaleString(activeLanguage())} ${p.currency}` : null);

/** Cuenta atrás "HH:MM:SS" (o "2d 04:10" si falta más de un día) hasta `iso`; null si ya empezó */
export function countdown(iso, now = Date.now()) {
  let s = Math.floor((new Date(iso).getTime() - now) / 1000);
  if (!(s > 0)) return null;
  const d = Math.floor(s / 86400); s -= d * 86400;
  const pad = n => String(n).padStart(2, "0");
  const hm = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`;
  return d ? `${d}d ${hm}` : `${hm}:${pad(s % 60)}`;
}

// Fases que PandaScore escribe en inglés → clave de traducción; las demás ("Round 1 Match 3") se muestran tal cual
const STAGES = {
  "grand final": "val.stage.grandFinal",
  "upper bracket final": "val.stage.upperFinal",
  "lower bracket final": "val.stage.lowerFinal",
  "upper bracket semifinal": "val.stage.upperSemi",
  "lower bracket semifinal": "val.stage.lowerSemi",
  "upper bracket quarterfinal": "val.stage.upperQuarter",
  "lower bracket quarterfinal": "val.stage.lowerQuarter",
  final: "val.stage.final",
  semifinal: "val.stage.semi",
  quarterfinal: "val.stage.quarter",
};
export const stageLabel = (stage, t) => (stage && STAGES[stage.toLowerCase()] ? t(STAGES[stage.toLowerCase()]) : stage || null);

/** El equipo ganador y el rival de un partido terminado */
export function winnerOf(match) {
  const [a, b] = match?.teams || [];
  if (!a || !b || match.winnerId == null) return null;
  return match.winnerId === a.id ? { winner: a, loser: b } : { winner: b, loser: a };
}
