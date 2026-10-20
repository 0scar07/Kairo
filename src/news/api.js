import { api } from "../api/client";
import { activeLanguage } from "../i18n";

// Noticias de todos los juegos y artículos de Riot listos para leer (ver server/routes/news.js)
export const getNews = lang => api.get("/news", { params: { lang } }).then(r => r.data);
export const getArticle = (game, path) => api.get("/news/article", { params: { game, path } }).then(r => r.data);

const DAY = 24 * 60 * 60 * 1000;
export const fmtNewsDate = iso => (iso ? new Date(iso).toLocaleDateString(activeLanguage(), { day: "numeric", month: "short" }) : null);
export const fmtLongDate = iso => (iso ? new Date(iso).toLocaleDateString(activeLanguage(), { day: "numeric", month: "long", year: "numeric" }) : null);

// Arte de cada juego cuando la noticia no trae imagen (los anuncios de Steam a veces no la tienen)
const STEAM = id => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_hero.jpg`;
const FALLBACK_ART = { dota2: STEAM(570), apex: STEAM(1172470), pubg: STEAM(578080) };
export const imageOf = item => item?.image || FALLBACK_ART[item?.game] || null;

/**
 * Lo destacado del carrusel: el último campeón de esports (si es de los últimos 45 días), el parche más nuevo de cada
 * juego de Riot y el evento del momento de Fortnite, hasta 5, de lo más nuevo a lo más viejo.
 */
export function featured(items) {
  const out = [];
  const champion = items.find(i => i.kind === "champion" && i.date && Date.now() - new Date(i.date).getTime() < 45 * DAY);
  if (champion) out.push(champion);
  const seen = new Set();
  for (const i of items) {
    if (i.kind === "patch" && i.article && !seen.has(i.game)) { seen.add(i.game); out.push(i); }
  }
  const event = items.find(i => i.game === "fortnite");
  out.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (event) out.push(event);
  return out.slice(0, 5);
}

/** Póster de un campeón cambiado: el retrato de pantalla de carga en LoL; el banner oficial en Wild Rift */
export const posterOf = entry => (entry?.key ? `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${entry.key}_0.jpg` : entry?.banner || null);
