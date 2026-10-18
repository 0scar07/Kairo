import { api } from "../../api/client";
import { activeLanguage } from "../../i18n";

// Esports de LoL a través del backend de Kairo (ver server/routes/esports.js)
const get = (path, params = {}) => api.get(`/esports${path}`, { params: { hl: activeLanguage(), ...params }, timeout: 45000 }).then(r => r.data);

// [{ id, slug, name, short, region, image }]
export const getProLeagues = () => get("/leagues");

// { league, tournaments: [{ id, slug, startDate, endDate }], tournamentId, standings: [{ name, rows: [...] }] }
export const getProLeague = (slug, tournamentId) => get(`/leagues/${slug}`, tournamentId ? { tournamentId } : {});

// { id, slug, name, code, image, league, players: [{ id, name, firstName, lastName, role, image }] }
export const getProTeam = slug => get(`/teams/${slug}`);

// { tournamentId, series, games, players: { [playerId]: { games, wins, kda, killParticipation, ... champions } } }
export const getProTeamStats = (slug, tournamentId) => get(`/teams/${slug}/stats`, { tournamentId });

// "lck_split_3_2026" -> "Split 3 2026"; "msi_2026" -> "2026"; el nombre de la liga va aparte
export function tournamentLabel(slug, leagueSlug) {
  const rest = String(slug || "").replace(new RegExp(`^${leagueSlug}_?`), "").replace(/_/g, " ").trim();
  return rest ? rest.replace(/\b\w/g, c => c.toUpperCase()) : String(slug || "");
}

// Rol de lolesports -> clave de traducción
export const ROLE_KEYS = { top: "pros.role.top", jungle: "pros.role.jungle", mid: "pros.role.mid", bottom: "pros.role.bottom", support: "pros.role.support" };
