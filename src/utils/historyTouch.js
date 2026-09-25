import AsyncStorage from "@react-native-async-storage/async-storage";
import { HISTORY_TOUCH_KEY } from "../constants/config";
import { loadFavorites } from "./favorites";
import { touchRankHistory } from "../games/lol/history";

const EVERY_MS = 20 * 60 * 60_000;

// Una vez al día avisa al servidor de los favoritos de LoL para que siga guardando su historial de rango
export async function touchFavoritesHistory() {
  const last = Number(await AsyncStorage.getItem(HISTORY_TOUCH_KEY)) || 0;
  if (Date.now() - last < EVERY_MS) return;
  const items = (await loadFavorites()).filter(f => f.gameId === "lol" && f.puuid).slice(0, 50).map(f => ({ puuid: f.puuid, region: f.region }));
  if (!items.length) return;
  await touchRankHistory(items);
  await AsyncStorage.setItem(HISTORY_TOUCH_KEY, String(Date.now()));
}
