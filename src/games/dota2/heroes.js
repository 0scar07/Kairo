import AsyncStorage from "@react-native-async-storage/async-storage";
import { createGameApi } from "../../api/gameApi";

// Héroes de Dota 2 (id -> nombre interno y nombre visible). Se piden al backend (OpenDota) una vez al día
// y se guardan para no volver a pedirlos. Las imágenes vienen del CDN de Valve.
const client = createGameApi("dota2");
const CACHE_KEY = "dota2_heroes_v1";
const DAY = 24 * 60 * 60 * 1000;

let byId = {};
let loading = null;

async function load() {
  try {
    const cached = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || "null");
    if (cached && Date.now() - cached.ts < DAY) { byId = cached.byId; return; }
  } catch (e) {
    console.warn("Caché de héroes ilegible:", e.message);
  }
  const { items } = await client.get("/heroes");
  byId = Object.fromEntries(items.map(h => [h.id, h]));
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), byId })).catch(e => console.warn("AsyncStorage:", e.message));
}

// Carga (una sola vez) la lista de héroes; nunca falla: sin datos los héroes se muestran con su número
export function ensureHeroes() {
  if (Object.keys(byId).length) return Promise.resolve();
  if (!loading) loading = load().catch(e => { console.warn("Héroes de Dota 2 no disponibles:", e.message); loading = null; });
  return loading;
}

export const heroById = id => byId[id] || null;
export const heroName = id => byId[id]?.label || `#${id}`;
const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
export const heroIcon = id => (byId[id] ? `${CDN}/icons/${byId[id].name}.png` : null);
