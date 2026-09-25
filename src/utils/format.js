import { t, hasKey, activeLanguage, getLanguage } from "../i18n";

// Master, Grandmaster y Challenger no tienen división (I-IV)
export const APEX_TIERS = ["MASTER", "GRANDMASTER", "CHALLENGER"];
export const tierLabel = (tier, rank) => (APEX_TIERS.includes(tier) ? tier : `${tier} ${rank || ""}`.trim());

// 623792 -> "623.792" (es), "623,792" (en), "623 792" (fr)
export const formatNumber = n =>
  String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, getLanguage(activeLanguage()).thousands);

// Números grandes en poco espacio: 1900000 -> "1.9M", 310500 -> "310.5k"; los pequeños llevan separador de miles
export function formatCompact(n) {
  const v = n || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 100_000) return `${(v / 1_000).toFixed(1)}k`;
  return formatNumber(v);
}

// Porcentaje de victorias sin dividir entre cero
export function winrate(wins, losses) {
  const total = (wins || 0) + (losses || 0);
  return total ? Math.round((wins / total) * 100) : 0;
}

// "5m", "3h"... a partir de un timestamp en ms (las unidades cambian con el idioma)
export function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return `${s}${t("time.s")}`;
  if (s < 3600)  return `${Math.floor(s / 60)}${t("time.m")}`;
  if (s < 86400) return `${Math.floor(s / 3600)}${t("time.h")}`;
  return `${Math.floor(s / 86400)}${t("time.d")}`;
}

// Segundos -> "m:ss"
export function formatDuration(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Mensaje legible para mostrar en pantalla. Los errores del backend traen un `code`: si la app lo conoce,
 * se muestra traducido; si no, se usa el mensaje que mandó el servidor.
 */
export function errorMessage(e, fallback) {
  const data = e?.response?.data;
  if (data?.code && hasKey(`errors.${data.code}`)) return t(`errors.${data.code}`, { seconds: data.retryAfter, provider: data.provider });
  if (data?.error) return data.error;
  if (e?.code === "ERR_NETWORK" || e?.message === "Network Error") return t("errors.network");
  if (e?.code === "ECONNABORTED") return t("errors.timeout");
  return e?.message || fallback || t("errors.unexpected");
}
