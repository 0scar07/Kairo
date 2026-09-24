import AsyncStorage from "@react-native-async-storage/async-storage";
import { ACTIVE_GAME_KEY, REGION_KEY, MY_PROFILE_KEY, HAPTICS_KEY } from "../constants/config";
import { DEFAULT_REGION, REGIONS } from "../constants/regions";

export async function loadRegion() {
  const saved = await AsyncStorage.getItem(REGION_KEY);
  return REGIONS.some(r => r.id === saved) ? saved : DEFAULT_REGION;
}

export const saveRegion = id => AsyncStorage.setItem(REGION_KEY, id);

// La háptica está activada salvo que el usuario la apague
export async function loadHaptics() {
  return (await AsyncStorage.getItem(HAPTICS_KEY)) !== "off";
}
export const saveHaptics = enabled => AsyncStorage.setItem(HAPTICS_KEY, enabled ? "on" : "off");

export const loadActiveGame = () => AsyncStorage.getItem(ACTIVE_GAME_KEY);
export const saveActiveGame = id => AsyncStorage.setItem(ACTIVE_GAME_KEY, id);

// "Mi perfil" por juego: { lol: { gameName, tagLine, region }, tft: {...} }
export async function loadMyProfiles() {
  const raw = await AsyncStorage.getItem(MY_PROFILE_KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  // Formato antiguo: una sola cuenta de LoL { gameName, tagLine }
  if (parsed.gameName) return { lol: { ...parsed, region: parsed.region || DEFAULT_REGION } };
  return parsed;
}

export async function saveMyProfile(gameId, account) {
  const all = await loadMyProfiles();
  await AsyncStorage.setItem(MY_PROFILE_KEY, JSON.stringify({ ...all, [gameId]: account }));
}
