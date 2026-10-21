import AsyncStorage from "@react-native-async-storage/async-storage";
import { FOLLOWED_TEAMS_KEY } from "../constants/config";

// Un equipo seguido de Valorant: { id, name, acronym, image, alerts }. Vive solo en el celular: los avisos de sus
// partidos se programan aquí mismo (ver notifications/teamAlerts.js), igual que los de los pros de LoL.

export async function loadFollowedTeams() {
  try {
    const raw = await AsyncStorage.getItem(FOLLOWED_TEAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Equipos seguidos ilegibles:", e.message);
    return [];
  }
}

const listeners = new Set();
export function onFollowedTeamsChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function save(list) {
  await AsyncStorage.setItem(FOLLOWED_TEAMS_KEY, JSON.stringify(list));
  listeners.forEach(fn => { try { fn(list); } catch (e) { console.warn("Oyente de equipos:", e.message); } });
  return list;
}

export const isFollowingTeam = (list, id) => list.some(t => t.id === id);

// Sigue o deja de seguir un equipo; al seguir, los avisos quedan activados. Devuelve { list, following }
export async function toggleFollowTeam(team) {
  const list = await loadFollowedTeams();
  const following = !isFollowingTeam(list, team.id);
  const next = following
    ? [...list, { id: team.id, name: team.name, acronym: team.acronym || null, image: team.image || null, alerts: true }]
    : list.filter(t => t.id !== team.id);
  return { list: await save(next), following };
}

export async function setTeamAlerts(id, on) {
  const list = await loadFollowedTeams();
  return save(list.map(t => (t.id === id ? { ...t, alerts: on } : t)));
}
