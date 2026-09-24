// Porcentaje de victorias sin dividir entre cero
export function winrate(wins, losses) {
  const total = (wins || 0) + (losses || 0);
  return total ? Math.round((wins / total) * 100) : 0;
}

// "hace 5m", "hace 3h"... a partir de un timestamp en ms
export function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Segundos -> "m:ss"
export function formatDuration(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Mensaje de error legible para mostrar en pantalla
export function errorMessage(e, fallback = "Ocurrió un error inesperado") {
  if (e?.response?.data?.error) return e.response.data.error;
  if (e?.code === "ERR_NETWORK" || e?.message === "Network Error") return "Sin conexión con el servidor";
  if (e?.code === "ECONNABORTED") return "El servidor tardó demasiado en responder";
  return e?.message || fallback;
}
