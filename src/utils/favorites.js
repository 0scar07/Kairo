import AsyncStorage from "@react-native-async-storage/async-storage";
import { FAVORITES_KEY } from "../constants/config";
import { DEFAULT_REGION } from "../constants/regions";

// Un favorito: { gameId, region, puuid, gameName, tagLine, iconId, tier, rank }
// Los favoritos antiguos usaban `game` (o nada, en LoL) y no guardaban la región.
export function normalizeFavorite(f) {
  const { game, ...rest } = f;
  return { ...rest, gameId: f.gameId || game || "lol", region: f.region || DEFAULT_REGION };
}

export const isFavoriteIn = (list, gameId, puuid) =>
  list.some(f => f.gameId === gameId && f.puuid === puuid);

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
  const exists = isFavoriteIn(list, fav.gameId, fav.puuid);
  const next = exists
    ? list.filter(f => !(f.gameId === fav.gameId && f.puuid === fav.puuid))
    : [...list, fav];
  await saveFavorites(next);
  return { favorites: next, isFav: !exists };
}

export async function removeFavorite(gameId, puuid) {
  const list = await loadFavorites();
  const next = list.filter(f => !(f.gameId === gameId && f.puuid === puuid));
  await saveFavorites(next);
  return next;
}
