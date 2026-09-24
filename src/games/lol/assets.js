import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ddBase, ddVersion } from "../../api/ddragon";

// Hechizos de invocador y runas (Data Dragon). Se guardan compactos por versión en AsyncStorage.
//   spells: { idNumérico: "SummonerFlash.png" }     perks: { idRuna|idEstilo: "perk-images/…png" }
let maps = null;
let loading = null;

async function load() {
  const cacheKey = `dd_lol_perks_${ddVersion()}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) { maps = JSON.parse(cached); return; }
  } catch (e) {
    console.warn("Caché de runas ilegible:", e.message);
  }

  const [spellsRes, runesRes] = await Promise.all([
    axios.get(`${ddBase()}/data/en_US/summoner.json`, { timeout: 10000 }),
    axios.get(`${ddBase()}/data/en_US/runesReforged.json`, { timeout: 10000 }),
  ]);

  const spells = {};
  Object.values(spellsRes.data.data).forEach(s => { spells[s.key] = s.image.full; });

  const perks = {};
  runesRes.data.forEach(style => {
    perks[style.id] = style.icon;
    style.slots.forEach(slot => slot.runes.forEach(r => { perks[r.id] = r.icon; }));
  });

  maps = { spells, perks };
  AsyncStorage.setItem(cacheKey, JSON.stringify(maps)).catch(e => console.warn("AsyncStorage:", e.message));
}

// Carga (una sola vez) hechizos y runas; nunca falla: sin datos simplemente no se muestran
export function ensureLolAssets() {
  if (maps) return Promise.resolve();
  if (!loading) loading = load().catch(e => { console.warn("Data Dragon (runas y hechizos):", e.message); maps = { spells: {}, perks: {} }; });
  return loading;
}

export const spellIcon = id => (maps?.spells[id] ? `${ddBase()}/img/spell/${maps.spells[id]}` : null);
// Las imágenes de runas no llevan versión en la URL
export const perkIcon  = id => (maps?.perks[id] ? `https://ddragon.leagueoflegends.com/cdn/img/${maps.perks[id]}` : null);

// Runas principales de un participante: piedra angular + estilo secundario
export function perksOf(p) {
  const styles = p.perks?.styles || [];
  return {
    keystone:  styles[0]?.selections?.[0]?.perk ?? null,
    secondary: styles[1]?.style ?? null,
  };
}
