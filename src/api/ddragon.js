import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DD_VERSION as FALLBACK_VERSION } from "../constants/config";

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const VERSION_KEY  = "dd_version";
const CHAMPS_KEY   = "dd_champions";

let version = FALLBACK_VERSION;
let champIds = {}; // nombre normalizado -> ID de Data Dragon

const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function storageGet(key) {
  try { return await AsyncStorage.getItem(key); } catch (e) { return null; }
}
async function storageSet(key, value) {
  try { await AsyncStorage.setItem(key, value); } catch (e) { console.warn("AsyncStorage:", e.message); }
}

async function loadVersion() {
  try {
    const { data } = await axios.get(VERSIONS_URL, { timeout: 5000 });
    version = data[0];
    await storageSet(VERSION_KEY, version);
  } catch (e) {
    const saved = await storageGet(VERSION_KEY);
    if (saved) version = saved;
    console.warn("Data Dragon: usando versión", version, "-", e.message);
  }
}

// Mapa nombre -> ID (ej. "Wukong" -> "MonkeyKing", "Nunu & Willump" -> "Nunu")
async function loadChampions() {
  const cacheKey = `${CHAMPS_KEY}_${version}`;
  let list = null;
  const cached = await storageGet(cacheKey);
  if (cached) {
    try { list = JSON.parse(cached); } catch (e) { list = null; }
  }
  if (!list) {
    try {
      const { data } = await axios.get(`${ddBase()}/data/en_US/champion.json`, { timeout: 8000 });
      list = Object.values(data.data).map(c => ({ id: c.id, name: c.name }));
      await storageSet(cacheKey, JSON.stringify(list));
    } catch (e) {
      console.warn("Data Dragon: sin lista de campeones -", e.message);
      return;
    }
  }
  champIds = {};
  list.forEach(c => { champIds[norm(c.id)] = c.id; champIds[norm(c.name)] = c.id; });
}

export async function initDataDragon() {
  await loadVersion();
  await loadChampions();
  return version;
}

export const ddBase = () => `https://ddragon.leagueoflegends.com/cdn/${version}`;

// Normaliza el nombre de campeón de la partida al ID de Data Dragon
export function championId(name) {
  if (!name) return "";
  return champIds[norm(name)] || String(name).replace(/[^A-Za-z0-9]/g, "");
}

export const championIcon    = name => `${ddBase()}/img/champion/${championId(name)}.png`;
export const itemIcon        = id   => `${ddBase()}/img/item/${id}.png`;
export const profileIconUrl  = id   => `${ddBase()}/img/profileicon/${id}.png`;
