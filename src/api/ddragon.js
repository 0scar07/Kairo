import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DD_VERSION as FALLBACK_VERSION } from "../constants/config";

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const VERSION_KEY  = "dd_version";
const CHAMPS_KEY   = "dd_champions_v2";   // v2: incluye la clave numérica de cada campeón

let version = FALLBACK_VERSION;
let champIds = {}; // nombre normalizado -> ID de Data Dragon
let champKeys = {}; // clave numérica (championId de Riot) -> { id, name }
let champEnNames = {}; // id de Data Dragon -> nombre en inglés
let champLocalNames = {}; // id de Data Dragon -> nombre en el idioma activo
let ddLocale = "en_US";   // idioma de Data Dragon activo (para los nombres de las skins)
const artCache = {};      // id -> promesa de { uri, fallback, skin }

const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function storageGet(key) {
  try { return await AsyncStorage.getItem(key); } catch (e) { console.warn("AsyncStorage:", e.message); return null; }
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
    try { list = JSON.parse(cached); } catch (e) { console.warn("Caché de campeones ilegible:", e.message); list = null; }
  }
  if (!list) {
    try {
      const { data } = await axios.get(`${ddBase()}/data/en_US/champion.json`, { timeout: 8000 });
      list = Object.values(data.data).map(c => ({ id: c.id, name: c.name, key: Number(c.key) }));
      await storageSet(cacheKey, JSON.stringify(list));
    } catch (e) {
      console.warn("Data Dragon: sin lista de campeones -", e.message);
      return;
    }
  }
  champIds = {};
  champKeys = {};
  list.forEach(c => {
    champIds[norm(c.id)] = c.id; champIds[norm(c.name)] = c.id;
    champKeys[c.key] = { id: c.id, name: c.name };
    champEnNames[c.id] = c.name;
  });
}

// Nombres de campeón en un idioma de Data Dragon (es_MX, pt_BR…). Se guardan por versión e idioma; si falla, se sigue en inglés.
export async function loadChampionNames(locale) {
  ddLocale = locale || "en_US";
  if (!locale || locale === "en_US") { champLocalNames = {}; return; }
  const cacheKey = `dd_champion_names_${locale}_${version}`;
  let names = null;
  const cached = await storageGet(cacheKey);
  if (cached) {
    try { names = JSON.parse(cached); } catch (e) { console.warn("Caché de nombres ilegible:", e.message); }
  }
  if (!names) {
    try {
      const { data } = await axios.get(`${ddBase()}/data/${locale}/champion.json`, { timeout: 8000 });
      names = Object.fromEntries(Object.values(data.data).map(c => [c.id, c.name]));
      await storageSet(cacheKey, JSON.stringify(names));
    } catch (e) {
      console.warn("Data Dragon: sin nombres de campeones en", locale, "-", e.message);
      champLocalNames = {};
      return;
    }
  }
  champLocalNames = names;
}

export async function initDataDragon() {
  await loadVersion();
  await loadChampions();
  return version;
}

export const ddVersion = () => version;
export const ddBase = () => `https://ddragon.leagueoflegends.com/cdn/${version}`;

// Campeón a partir del ID numérico de Riot (7 -> { id: "Leblanc", name: "LeBlanc" }); null si no se conoce
export const championByKey = key => champKeys[key] || null;
// Todos los campeones: [{ key (ID numérico de Riot), id (Data Dragon), name }] ordenados por su nombre en el idioma activo
export const allChampions = () => Object.entries(champKeys)
  .map(([key, c]) => ({ key: Number(key), id: c.id, name: c.name, label: champLocalNames[c.id] || c.name }))
  .sort((a, b) => a.label.localeCompare(b.label));
// Idioma de Data Dragon activo (es_MX, en_US…), para pedir textos de habilidades y runas
export const ddLanguage = () => ddLocale;

// Normaliza el nombre de campeón de la partida al ID de Data Dragon
export function championId(name) {
  if (!name) return "";
  return champIds[norm(name)] || String(name).replace(/[^A-Za-z0-9]/g, "");
}

// Nombre para mostrar de un campeón (id o nombre de la partida) en el idioma activo
export function championLabel(name) {
  const id = championId(name);
  return champLocalNames[id] || champEnNames[id] || name;
}

export const championIcon    = name => `${ddBase()}/img/champion/${championId(name)}.png`;
export const championSplash  = name => `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId(name)}_0.jpg`;
export const itemIcon        = id   => `${ddBase()}/img/item/${id}.png`;
export const profileIconUrl  = id   => `${ddBase()}/img/profileicon/${id}.png`;

/**
 * Arte para el fondo del perfil: el splash de la skin más reciente del campeón (las variantes "(…)" se omiten porque
 * a menudo no tienen splash propio) y su nombre. `fallback` es el splash clásico por si la imagen de la skin falla.
 * La API de Riot no dice qué skin usa cada jugador: es solo decorativo (la de su main más reciente, no necesariamente la suya).
 */
export function championArt(name) {
  const id = championId(name);
  if (!id) return Promise.resolve(null);
  const key = `${id}_${ddLocale}`;
  if (!artCache[key]) {
    artCache[key] = axios.get(`${ddBase()}/data/${ddLocale}/champion/${id}.json`, { timeout: 8000 })
      .then(({ data }) => {
        const skins = (data.data?.[id]?.skins || []).filter(sk => sk.num > 0 && !/\(/.test(sk.name));
        const skin = skins.sort((a, b) => b.num - a.num)[0];
        const base = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}`;
        return { uri: `${base}_${skin ? skin.num : 0}.jpg`, fallback: `${base}_0.jpg`, skin: skin ? skin.name : championLabel(id) };
      })
      .catch(e => { delete artCache[key]; console.warn("Data Dragon: sin skins de", id, "-", e.message); return { uri: championSplash(id), fallback: null, skin: championLabel(id) }; });
  }
  return artCache[key];
}
