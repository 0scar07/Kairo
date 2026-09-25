import AsyncStorage from "@react-native-async-storage/async-storage";

// Copia local de los últimos perfiles vistos, para poder abrirlos sin conexión.
// Se guardan pocos y recortados (AsyncStorage en Android tiene un tope total de unos 6 MB).
const INDEX_KEY = "kairo_pc_index";
const MAX_PROFILES = 8;
const MAX_CHARS = 600_000;
const MAX_MATCHES = 6;

const normalize = s => String(s ?? "").toLowerCase();
const idOf = (gameId, region, gameName, tagLine) => `${gameId}|${region}|${normalize(gameName)}|${normalize(tagLine)}`;
const dataKey = id => `kairo_pc_${id}`;

// ¿El error es de falta de red (no llegó ni a responder el servidor)?
export const isOffline = e => !e?.response && (e?.code === "ERR_NETWORK" || e?.code === "ECONNABORTED" || e?.message === "Network Error" || e?.message === "timeout of 15000ms exceeded");

export async function saveCachedProfile(gameId, region, gameName, tagLine, data) {
  // Se recortan las partidas (lo más pesado); sin "cargar más" porque los índices de página ya no coincidirían
  const slim = Array.isArray(data?.matches) ? { ...data, matches: data.matches.slice(0, MAX_MATCHES), hasMore: false } : data;
  const body = JSON.stringify({ at: Date.now(), data: slim });
  if (body.length > MAX_CHARS) return;

  const id = idOf(gameId, region, gameName, tagLine);
  const index = JSON.parse((await AsyncStorage.getItem(INDEX_KEY)) || "[]").filter(x => x !== id);
  index.unshift(id);
  const dropped = index.splice(MAX_PROFILES);
  await AsyncStorage.multiSet([[dataKey(id), body], [INDEX_KEY, JSON.stringify(index)]]);
  if (dropped.length) await AsyncStorage.multiRemove(dropped.map(dataKey));
}

// -> { at, data } o null
export async function loadCachedProfile(gameId, region, gameName, tagLine) {
  try {
    const raw = await AsyncStorage.getItem(dataKey(idOf(gameId, region, gameName, tagLine)));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Copia local ilegible:", e.message);
    return null;
  }
}
