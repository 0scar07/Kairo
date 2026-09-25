import AsyncStorage from "@react-native-async-storage/async-storage";
import { FAVORITES_KEY } from "../constants/config";
import { DEFAULT_REGION } from "../constants/regions";

// Un favorito: { gameId, region, puuid, gameName, tagLine, iconId, tier, rank }
// Los favoritos antiguos usaban `game` (o nada, en LoL) y no guardaban la región.
export function normalizeFavorite(f) {
  const { game, ...rest } = f;
  return { ...rest, gameId: f.gameId || game || "lol", region: f.region || DEFAULT_REGION };
}

const lower = s => String(s || "").toLowerCase();

/**
 * ¿Es el mismo jugador? Riot cifra el PUUID por aplicación: si cambia la API key, el PUUID guardado
 * deja de coincidir. Por eso también se compara por Riot ID + región.
 */
export const sameFavorite = (a, b) =>
  a.gameId === b.gameId && (
    a.puuid === b.puuid ||
    (a.region === b.region && lower(a.gameName) === lower(b.gameName) && lower(a.tagLine) === lower(b.tagLine))
  );

export const isFavoriteIn = (list, player) => list.some(f => sameFavorite(f, player));

// Lee los favoritos y, si venían en el formato antiguo, los migra y los vuelve a guardar
export async function loadFavorites() {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  const stored = JSON.parse(raw);
  const list = stored.map(normalizeFavorite);
  if (JSON.stringify(list) !== raw) await saveFavorites(list);
  return list;
}

// Quien quiera enterarse de los cambios (la sincronización de notificaciones) se suscribe aquí:
// saveFavorites es el único punto por el que se escriben los favoritos.
const listeners = new Set();
export function onFavoritesChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function saveFavorites(list) {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  listeners.forEach(fn => { try { fn(list); } catch (e) { console.warn("Oyente de favoritos:", e.message); } });
}

// Alertas (campanita): LoL (partida en vivo, rango) y Brawl Stars / Clash Royale (récords de trofeos). El favorito lleva `alerts: true`
export const ALERT_GAMES = ["lol", "brawlstars", "clashroyale"];
export const canAlert = fav => ALERT_GAMES.includes(fav?.gameId) && Boolean(fav.puuid);
export const isSupercellAlert = fav => fav?.gameId === "brawlstars" || fav?.gameId === "clashroyale";
export const hasAlerts = fav => canAlert(fav) && fav.alerts === true;
export const alertFavorites = list => list.filter(hasAlerts);

// Activa o desactiva las alertas de un favorito ya guardado; devuelve la lista nueva
export async function setFavoriteAlerts(fav, on) {
  const list = await loadFavorites();
  const next = list.map(f => (sameFavorite(f, fav) ? { ...f, alerts: on } : f));
  await saveFavorites(next);
  return next;
}

// Añade o quita un favorito; devuelve la lista nueva y si quedó marcado
export async function toggleFavorite(fav) {
  const list = await loadFavorites();
  const exists = isFavoriteIn(list, fav);
  const next = exists ? list.filter(f => !sameFavorite(f, fav)) : [...list, fav];
  await saveFavorites(next);
  return { favorites: next, isFav: !exists };
}

export async function removeFavorite(fav) {
  const next = (await loadFavorites()).filter(f => !sameFavorite(f, fav));
  await saveFavorites(next);
  return next;
}

// Actualiza un favorito ya guardado con los datos actuales (PUUID nuevo, ícono, rango). No añade nada.
export async function refreshFavorite(fav) {
  const list = await loadFavorites();
  if (!isFavoriteIn(list, fav)) return list;
  const next = list.map(f => (sameFavorite(f, fav) ? { ...f, ...fav } : f));
  if (JSON.stringify(next) !== JSON.stringify(list)) await saveFavorites(next);
  return next;
}
