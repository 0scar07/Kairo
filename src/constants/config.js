// URL del backend (server/). En dispositivo físico usa la IP de tu PC:
// define EXPO_PUBLIC_API_URL en un .env de la raíz o edita el valor por defecto.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.8:3000";

// Versión de Data Dragon de respaldo; la real se lee al arrancar (ver src/api/ddragon.js)
export const DD_VERSION = "16.8.1";

export const APP_NAME = "Kairo";
export const APP_TAGLINE = "Cada partida cuenta.";

// Claves de AsyncStorage (las antiguas se migran en src/utils/storage.js)
export const FAVORITES_KEY  = "kairo_favorites";
export const MY_PROFILE_KEY = "kairo_my_profile";
export const LEGACY_KEYS = {
  [FAVORITES_KEY]:  ["loltracker_favorites"],
  [MY_PROFILE_KEY]: ["ggtracker_my_profile"],
};

export const TIER_COLORS = {
  IRON: "#8a8a8a", BRONZE: "#cd7f32", SILVER: "#a8a9ad",
  GOLD: "#FFD700", PLATINUM: "#00d4aa", EMERALD: "#50C878",
  DIAMOND: "#b9f2ff", MASTER: "#9b59b6", GRANDMASTER: "#e74c3c",
  CHALLENGER: "#f1c40f",
};

export const TIER_ICONS = {
  IRON: "⚫", BRONZE: "🟤", SILVER: "⚪", GOLD: "🟡",
  PLATINUM: "🔵", EMERALD: "🟢", DIAMOND: "💎",
  MASTER: "🟣", GRANDMASTER: "🔴", CHALLENGER: "⭐",
};
