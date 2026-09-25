import { t } from "../i18n";

// Utilidades comunes a los juegos de Supercell (Brawl Stars, Clash Royale y Clash of Clans)

// Estos juegos no tienen regiones: se usa un valor fijo para favoritos y recientes
export const GLOBAL_REGION = "global";

// "#2pp0" -> "2PP0" (Supercell trata la O como cero)
export const tagOf = raw => String(raw || "").trim().replace(/^#/, "").toUpperCase().replace(/O/g, "0");

// "20240102T130405.000Z" -> milisegundos
export function parseBattleTime(value) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(String(value || ""));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : Date.now();
}

// "gemGrab" -> "Gem Grab", "soloShowdown" -> "Solo Showdown"
export const humanize = s =>
  String(s || "").replace(/([a-z])([A-Z])(?=[a-z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase());

// Rol dentro del clan (Clash Royale y Clash of Clans)
const ROLES = { leader: "role.leader", coLeader: "role.coLeader", admin: "role.elder", elder: "role.elder", member: "role.member" };
export const clanRole = role => (ROLES[role] ? t(ROLES[role]) : null);

// Nombre en mayúsculas de la API ("SHELLY") -> "Shelly"
export const titleCase = s => String(s || "").toLowerCase().replace(/(^|[\s-])(\w)/g, (_, a, b) => a + b.toUpperCase());
