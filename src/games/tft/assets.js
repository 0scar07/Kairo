import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ddBase, ddVersion } from "../../api/ddragon";

// Datos de TFT en Data Dragon: campeones, rasgos (traits), objetos y aumentos.
// Se guardan compactos ([nombre, archivo de imagen, costo]) por versión en AsyncStorage.
const FILES = {
  champions: { file: "tft-champion", folder: "tft-champion" },
  traits:    { file: "tft-trait",    folder: "tft-trait" },
  items:     { file: "tft-item",     folder: "tft-item" },
  augments:  { file: "tft-augments", folder: "tft-augment" },
};

let maps = null;      // { champions: { idEnMinúsculas: [nombre, imagen, costo] }, ... }
let loading = null;

const key = id => String(id || "").toLowerCase();

async function fetchKind(kind) {
  const { file } = FILES[kind];
  const { data } = await axios.get(`${ddBase()}/data/en_US/${file}.json`, { timeout: 10000 });
  const out = {};
  Object.values(data.data).forEach(e => { out[key(e.id)] = [e.name, e.image?.full, e.tier || e.cost || null]; });
  return out;
}

async function load() {
  const cacheKey = `dd_tft_${ddVersion()}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) { maps = JSON.parse(cached); return; }
  } catch (e) {
    console.warn("Caché de TFT ilegible:", e.message);
  }

  const kinds = Object.keys(FILES);
  const results = await Promise.allSettled(kinds.map(fetchKind));
  maps = {};
  kinds.forEach((k, i) => {
    if (results[i].status === "fulfilled") maps[k] = results[i].value;
    else { maps[k] = {}; console.warn(`Data Dragon TFT: sin "${k}" -`, results[i].reason?.message); }
  });
  if (results.every(r => r.status === "fulfilled")) {
    AsyncStorage.setItem(cacheKey, JSON.stringify(maps)).catch(e => console.warn("AsyncStorage:", e.message));
  }
}

// Carga (una sola vez) los datos de TFT; nunca falla: sin datos se muestran placeholders
export function ensureTftAssets() {
  if (maps) return Promise.resolve();
  if (!loading) loading = load().catch(e => { console.warn("Data Dragon TFT:", e.message); maps = maps || {}; });
  return loading;
}

const iconUrl = (kind, image) => (image ? `${ddBase()}/img/${FILES[kind].folder}/${image}` : null);
// "TFT13_Ambassador" -> "Ambassador"
const readable = id => String(id || "").replace(/^TFT\d*_/i, "").replace(/^Item_/i, "").replace(/([a-z])([A-Z])/g, "$1 $2");

function lookup(kind, id) {
  const hit = maps?.[kind]?.[key(id)];
  return { name: hit?.[0] || readable(id), icon: iconUrl(kind, hit?.[1]), cost: hit?.[2] || null };
}

export const tftChampion = id => lookup("champions", id);
export const tftTrait    = id => lookup("traits", id);
export const tftItem     = id => lookup("items", id);
export const tftAugment  = id => lookup("augments", id);
