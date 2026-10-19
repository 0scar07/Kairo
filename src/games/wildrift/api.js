import AsyncStorage from "@react-native-async-storage/async-storage";
import { createGameApi } from "../../api/gameApi";
import { allChampions, championIcon, championId, championLabel, championSplash } from "../../api/ddragon";

const client = createGameApi("wildrift");

// Rangos y carriles en el orden en que se muestran (ver server/lib/wildrift.js)
export const RANKS = ["diamond", "master", "challenger", "legend"];
export const LANES = ["baron", "jungle", "mid", "dragon", "support"];
// Claves de traducción de cada carril y rango
export const LANE_LABEL = { baron: "wr.lane.baron", jungle: "wr.lane.jungle", mid: "wr.lane.mid", dragon: "wr.lane.dragon", support: "wr.lane.support" };
export const RANK_LABEL = { diamond: "wr.rank.diamond", master: "wr.rank.master", challenger: "wr.rank.challenger", legend: "wr.rank.legend" };
export const RANK_EMBLEM = { diamond: "diamond", master: "master", challenger: "challenger", legend: "challenger" };

export const getMeta = rank => client.get("/meta", { rank });
export const getChampion = heroId => client.get(`/champion/${heroId}`);
export const getEsports = () => client.get("/esports");
export const getNews = lang => client.get("/news", { lang });

/**
 * Cada campeón una sola vez, en su mejor carril (el de mejor puesto) dentro del meta de un rango:
 * [{ ...entrada, lane }]. Es la base del buscador, el comparador, "Mis mains" y "Suben y bajan".
 */
export function championsOf(meta) {
  const best = new Map();
  for (const lane of LANES) {
    for (const e of meta?.lanes?.[lane] || []) {
      const prev = best.get(e.heroId);
      if (!prev || (e.strength ?? 999) < (prev.strength ?? 999)) best.set(e.heroId, { ...e, lane });
    }
  }
  return [...best.values()];
}

// "Mis mains" de Wild Rift: ids de campeón guardados en el teléfono (sin cuenta ni servidor)
const MAINS_KEY = "kairo_wr_mains";
export async function loadMains() {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(MAINS_KEY)) || "[]");
    return Array.isArray(list) ? list.map(String) : [];
  } catch { return []; }
}
export async function toggleMain(heroId) {
  const list = await loadMains();
  const id = String(heroId);
  const next = list.includes(id) ? list.filter(x => x !== id) : [id, ...list].slice(0, 12);
  await AsyncStorage.setItem(MAINS_KEY, JSON.stringify(next));
  return next;
}

// Casi todos los campeones de Wild Rift existen en LoL: se usan sus retratos y splash de Data Dragon y el nombre en
// el idioma de la app. Los exclusivos de Wild Rift (Norra) usan el arte oficial de Wild Rift.
let known = null;
const inLol = key => {
  if (!known) known = new Set(allChampions().map(c => c.id.toLowerCase()));
  return Boolean(key) && known.has(championId(key).toLowerCase());
};

export const champName = c => (inLol(c?.key) ? championLabel(c.key) : c?.key || "?");
export const champIcon = c => (inLol(c?.key) ? championIcon(c.key) : c?.avatar || null);
export const champSplash = c => (inLol(c?.key) ? championSplash(c.key) : c?.poster || null);
