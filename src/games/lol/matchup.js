import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../api/client";
import { ddBase, ddLanguage, ddVersion, championByKey } from "../../api/ddragon";

// Enfrentamientos: el servidor suma partidas de Challenger por cruce de campeones (ver server/lib/builds.js) y aquí se
// completan con Data Dragon (habilidades del rival, qué objetos son finales y el nombre de las runas).

export const POSITIONS = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
export const POSITION_KEYS = { TOP: "matchup.pos.top", JUNGLE: "matchup.pos.jungle", MIDDLE: "matchup.pos.mid", BOTTOM: "matchup.pos.bot", UTILITY: "matchup.pos.support" };

export const getMatchup = async (championId, enemyId) => (await api.get(`/lol/builds/${championId}/vs/${enemyId}`)).data;
export const getOpponents = async (championId, position) => (await api.get(`/lol/builds/${championId}/opponents`, { params: position ? { position } : {} })).data;
export const getPopularMatchups = async position => (await api.get("/lol/builds/matchups", { params: { position } })).data;

// Posición más común de cada campeón en Challenger (para adivinar el rival de línea en una partida en vivo)
let metaPromise = null;
export function championPositions() {
  if (!metaPromise) {
    metaPromise = api.get("/lol/builds").then(r => Object.fromEntries((r.data.champions || []).map(c => [c.championId, c.position])))
      .catch(e => { metaPromise = null; throw e; });
  }
  return metaPromise;
}

const SMITE = 11;
/**
 * Rival de línea en una partida en vivo. La API de partidas en vivo no dice la posición de cada uno, así que se deduce:
 * Castigo = jungla; si no, la posición más común de cada campeón en Challenger. Solo se devuelve si hay exactamente un
 * rival con la misma posición que el jugador; si no, null (la app deja elegirlo).
 */
export function laneOpponent(me, enemies, positions) {
  const pos = p => ((p.spell1Id === SMITE || p.spell2Id === SMITE) ? "JUNGLE" : positions[p.championId] || null);
  const mine = me && pos(me);
  if (!mine) return null;
  const same = enemies.filter(e => pos(e) === mine);
  return same.length === 1 ? { enemy: same[0], position: mine } : null;
}

// --- Data Dragon: objetos, runas y habilidades (en caché por versión e idioma) ---

async function cached(key, load) {
  try {
    const hit = await AsyncStorage.getItem(key);
    if (hit) return JSON.parse(hit);
  } catch (e) { /* caché ilegible: se vuelve a pedir */ }
  const data = await load();
  AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
  return data;
}

let itemsPromise = null;
// { idObjeto: { name, gold, boots } } solo de objetos que se compran y no son consumibles ni abalorios
export function loadItems() {
  if (!itemsPromise) {
    const lang = ddLanguage();
    itemsPromise = cached(`dd_items_${ddVersion()}_${lang}`, async () => {
      const { data } = await axios.get(`${ddBase()}/data/${lang}/item.json`, { timeout: 10000 });
      const out = {};
      for (const [id, it] of Object.entries(data.data)) {
        const tags = it.tags || [];
        if (tags.includes("Consumable") || tags.includes("Trinket") || it.gold?.purchasable === false) continue;
        out[id] = { name: it.name, gold: it.gold?.total || 0, boots: tags.includes("Boots") };
      }
      return out;
    }).catch(e => { itemsPromise = null; throw e; });
  }
  return itemsPromise;
}
/** ¿Es un objeto completo (no inicial ni componente)? Las botas cuentan desde las de segundo nivel. */
export const isCompleted = (items, id) => {
  const it = items?.[id];
  return Boolean(it && (it.boots ? it.gold >= 900 : it.gold >= 1600));
};

let runesPromise = null;
// { idRuna: "Electrocutar" } en el idioma activo
export function loadRuneNames() {
  if (!runesPromise) {
    const lang = ddLanguage();
    runesPromise = cached(`dd_rune_names_${ddVersion()}_${lang}`, async () => {
      const { data } = await axios.get(`${ddBase()}/data/${lang}/runesReforged.json`, { timeout: 10000 });
      const out = {};
      for (const style of data) for (const slot of style.slots) for (const r of slot.runes) out[r.id] = r.name;
      return out;
    }).catch(e => { runesPromise = null; throw e; });
  }
  return runesPromise;
}

const spellCache = {};
// Habilidades de un campeón (por ID numérico): [{ key: "Q", name, text, cooldown, icon }] en el idioma activo
export function loadAbilities(championKey) {
  const champ = championByKey(championKey);
  if (!champ) return Promise.resolve([]);
  const lang = ddLanguage();
  const id = `${champ.id}_${lang}`;
  if (!spellCache[id]) {
    spellCache[id] = axios.get(`${ddBase()}/data/${lang}/champion/${champ.id}.json`, { timeout: 8000 })
      .then(({ data }) => (data.data?.[champ.id]?.spells || []).map((s, i) => ({
        key: "QWER"[i],
        name: s.name,
        // La descripción trae etiquetas propias del juego (<br>, <magicDamage>…): se dejan solo las palabras
        text: String(s.description || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
        cooldown: s.cooldownBurn || null,
        icon: `${ddBase()}/img/spell/${s.image.full}`,
      })))
      .catch(e => { delete spellCache[id]; throw e; });
  }
  return spellCache[id];
}
