// URL del backend (server/). En dispositivo físico usa la IP de tu PC:
// define EXPO_PUBLIC_API_URL en un .env de la raíz o edita el valor por defecto.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.8:3000";

// Versión de Data Dragon de respaldo; la real se lee al arrancar (ver src/api/ddragon.js)
export const DD_VERSION = "16.8.1";

export const APP_NAME = "Kairo";

// Claves de AsyncStorage (las antiguas se migran en src/utils/storage.js)
export const FAVORITES_KEY  = "kairo_favorites";
export const MY_PROFILE_KEY = "kairo_my_profile";
export const ACTIVE_GAME_KEY = "kairo_active_game";
export const REGION_KEY = "kairo_region";
export const RECENTS_KEY = "kairo_recents";
export const HAPTICS_KEY = "kairo_haptics";
export const LANGUAGE_KEY = "kairo_language";
export const LEGACY_KEYS = {
  [FAVORITES_KEY]:  ["loltracker_favorites"],
  [MY_PROFILE_KEY]: ["ggtracker_my_profile"],
};
