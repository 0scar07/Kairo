import { t } from "../../i18n";

// Orden de preferencia para mostrar primero el modo más jugado habitualmente
export const MODE_ORDER = ["squad-fpp", "squad", "duo-fpp", "duo", "solo-fpp", "solo"];
// "squad-fpp" -> clave "pubg.mode.squadFpp"
export const modeLabel = mode => (MODE_ORDER.includes(mode) ? t(`pubg.mode.${mode.replace(/-(\w)/g, (_, c) => c.toUpperCase())}`) : mode);

// Mapas de PUBG (nombre interno -> nombre del juego; son nombres propios)
const MAPS = {
  Baltic_Main: "Erangel", Erangel_Main: "Erangel", Desert_Main: "Miramar", DihorOtok_Main: "Vikendi",
  Tiger_Main: "Taego", Kiki_Main: "Deston", Neon_Main: "Rondo", Savage_Main: "Sanhok",
  Summerland_Main: "Karakin", Chimera_Main: "Paramo", Heaven_Main: "Haven",
};
export const mapName = internal => MAPS[internal] || String(internal || "").replace(/_Main$/, "");

// Estadísticas derivadas de un modo: K/D, daño medio, % de headshots…
export function derived(s) {
  const rounds = s.roundsPlayed || 0;
  const deaths = Math.max(1, rounds - (s.wins || 0));
  return {
    kd: (s.kills || 0) / deaths,
    avgDamage: rounds ? (s.damageDealt || 0) / rounds : 0,
    headshotPct: s.kills ? ((s.headshotKills || 0) / s.kills) * 100 : 0,
    avgSurvival: rounds ? (s.timeSurvived || 0) / rounds : 0,
  };
}

export const totalWins = modes => Object.values(modes || {}).reduce((sum, m) => sum + (m.wins || 0), 0);
