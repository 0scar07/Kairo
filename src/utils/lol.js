// CS = súbditos + monstruos de la jungla
export const csOf = p => (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);

// Riot ID (nombre#TAG) del participante; summonerName casi siempre viene vacío
export function playerName(p) {
  if (p.riotIdGameName) return `${p.riotIdGameName}#${p.riotIdTagline || "?"}`;
  return p.summonerName || p.championName || "Jugador";
}

// Porcentaje de victorias sin dividir entre cero
export function winrate(wins, losses) {
  const total = (wins || 0) + (losses || 0);
  return total ? Math.round((wins / total) * 100) : 0;
}

const QUEUES = {
  400: "Normal", 430: "Normal", 490: "Normal", 480: "Swiftplay",
  420: "Solo/Dúo", 440: "Flex",
  450: "ARAM", 720: "ARAM Clash",
  700: "Clash",
  830: "Vs. IA", 840: "Vs. IA", 850: "Vs. IA",
  900: "URF", 1900: "URF",
  1020: "Un solo campeón", 1300: "Nexus Blitz", 1400: "Libro de hechizos",
  1700: "Arena", 1710: "Arena",
};

export function queueLabel(queueId) {
  return QUEUES[queueId] || "Otro modo";
}

// Mensaje de error legible para mostrar en pantalla
export function errorMessage(e, fallback = "Ocurrió un error inesperado") {
  if (e?.response?.status === 429) return "Demasiadas solicitudes a Riot, espera un momento";
  if (e?.response?.data?.error) return e.response.data.error;
  if (e?.code === "ERR_NETWORK" || e?.message === "Network Error") return "Sin conexión con el servidor";
  return e?.message || fallback;
}
