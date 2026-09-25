import AsyncStorage from "@react-native-async-storage/async-storage";
import { RECENTS_KEY } from "../constants/config";

export const MAX_RECENTS = 8;

// Una búsqueda reciente: { gameId, region, gameName, tagLine, lookup?, ts }
const same = (a, b) =>
  a.gameId === b.gameId && a.region === b.region &&
  a.gameName.toLowerCase() === b.gameName.toLowerCase() && (a.tagLine || "").toLowerCase() === (b.tagLine || "").toLowerCase() &&
  (a.lookup || "") === (b.lookup || "");

export async function loadRecents() {
  const raw = await AsyncStorage.getItem(RECENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Añade al principio (sin duplicados) y conserva las últimas MAX_RECENTS
export async function addRecent(entry) {
  const current = await loadRecents();
  const next = [{ ...entry, ts: Date.now() }, ...current.filter(r => !same(r, entry))].slice(0, MAX_RECENTS);
  await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  return next;
}

export async function removeRecent(entry) {
  const next = (await loadRecents()).filter(r => !same(r, entry));
  await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  return next;
}

export const clearRecents = () => AsyncStorage.removeItem(RECENTS_KEY);
