import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_KEY, WIDGET_KEY } from "../constants/config";
import { resolveLanguage, setActiveLanguage } from "../i18n";
import { loadFavorites } from "../utils/favorites";
import { loadFollowedTeams } from "../utils/followedTeams";
import { getEsports } from "../games/valorant/api";
import { getLive } from "../games/lol/api";

/**
 * Datos de los widgets. El de rango usa lo que dejó Mi perfil la última vez que se abrió (Riot no deja consultar el
 * rango sin cupo de la API, y el widget se dibuja en segundo plano); el próximo partido y los favoritos en partida se
 * consultan al dibujar, cada 30 minutos como mucho.
 */

// Lo guarda Mi perfil (LoL): { name, tag, tier, rank, lp, weekLp, last5: [true, false…], at }
export async function saveRankData(rank) {
  try {
    const s = JSON.parse((await AsyncStorage.getItem(WIDGET_KEY)) || "{}");
    await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify({ ...s, rank: { ...rank, at: Date.now() } }));
  } catch (e) {
    console.warn("Datos del widget:", e.message);
  }
}

export async function loadRankData() {
  try { return JSON.parse((await AsyncStorage.getItem(WIDGET_KEY)) || "{}").rank || null; } catch { return null; }
}

// El widget se dibuja sin la app abierta: el idioma se lee del almacenamiento
export async function prepareLanguage() {
  try { setActiveLanguage(resolveLanguage(await AsyncStorage.getItem(LANGUAGE_KEY))); } catch { /* queda el de siempre */ }
}

/** Próximo partido de Valorant: el de un equipo que sigues o, si no, el siguiente de todos */
export async function loadNextMatch() {
  const [data, teams] = await Promise.all([getEsports().catch(() => null), loadFollowedTeams()]);
  if (!data) return null;
  const ids = new Set(teams.map(t => t.id));
  const running = (data.running || [])[0];
  const upcoming = data.upcoming || [];
  const mine = upcoming.find(m => (m.teams || []).some(t => ids.has(t.id)));
  const m = running || mine || upcoming[0];
  if (!m) return null;
  return { id: m.id, live: m.status === "running", beginAt: m.beginAt, teams: m.teams || [], event: m.serie || m.tournament || m.league?.name || "Valorant", followed: Boolean(mine && m === mine) };
}

/** Hasta 3 favoritos de LoL y si están en partida ahora */
export async function loadFriends() {
  const favs = (await loadFavorites()).filter(f => f.gameId === "lol" && f.puuid).slice(0, 3);
  const live = await Promise.all(favs.map(f => getLive(f.puuid, f.region).then(r => Boolean(r?.inGame)).catch(() => false)));
  return favs.map((f, i) => ({ name: f.gameName, iconId: f.iconId ?? null, inGame: live[i] }));
}
