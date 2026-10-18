import AsyncStorage from "@react-native-async-storage/async-storage";
import { FOLLOWED_PROS_KEY } from "../constants/config";

// Un pro seguido: { playerId, name, image, slug (de su equipo), teamCode, teamName, teamImage, leagueSlug, alerts }
// Vive solo en el celular: los avisos de sus partidas se programan aquí mismo (ver notifications/proAlerts.js).

export async function loadFollowedPros() {
  const raw = await AsyncStorage.getItem(FOLLOWED_PROS_KEY);
  return raw ? JSON.parse(raw) : [];
}

const listeners = new Set();
export function onFollowedProsChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function save(list) {
  await AsyncStorage.setItem(FOLLOWED_PROS_KEY, JSON.stringify(list));
  listeners.forEach(fn => { try { fn(list); } catch (e) { console.warn("Oyente de pros:", e.message); } });
  return list;
}

export const isFollowing = (list, playerId) => list.some(p => p.playerId === playerId);

// Sigue o deja de seguir; al seguir, los avisos quedan activados. Devuelve { list, following }
export async function toggleFollowPro(pro) {
  const list = await loadFollowedPros();
  const following = !isFollowing(list, pro.playerId);
  const next = following ? [...list, { ...pro, alerts: true }] : list.filter(p => p.playerId !== pro.playerId);
  return { list: await save(next), following };
}

export async function setProAlerts(playerId, on) {
  const list = await loadFollowedPros();
  return save(list.map(p => (p.playerId === playerId ? { ...p, alerts: on } : p)));
}
