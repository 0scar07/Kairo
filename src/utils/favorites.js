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

export const saveFavorites = list => AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(list));

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
