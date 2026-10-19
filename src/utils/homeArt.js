import axios from "axios";
import { championArt, championByKey, championSplash } from "../api/ddragon";
import { createGameApi } from "../api/gameApi";
import { loadMainChampion } from "./prefs";

/**
 * Fondo de Inicio para cada juego, con el mismo aire que el splash de LoL. Devuelve una promesa de:
 *  - { uri, fallback, fit: "cover" }   ilustración a todo lo ancho: splash (LoL, TFT), arte de temporada (Fortnite),
 *                                       banner de la leyenda (Apex), arte de Steam (Dota 2, Apex y PUBG) o arte oficial
 *                                       de Supercell sin logo (Brawl Stars, Clash Royale, Clash of Clans)
 *  - { uri, fit: "hero" }              personaje recortado (el héroe más jugado de Dota 2): grande y nítido a la derecha,
 *                                       fundido con el fondo igual que el splash
 *  - { logo: true }                     sin imagen posible: logo grande como marca de agua
 *  - null                               no se pudo conseguir: se queda solo el brillo de color
 * Si el jugador configuró "Mi perfil", se usa su main (ver `backdropKey` de cada juego y ProfileView); si no, una
 * alternativa pública por juego.
 */
const STEAM = id => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_hero.jpg`;   // 3840x1240
// Supercell no da arte por jugador: se usa su arte oficial (supercell.com), elegido sin logo para no chocar con KAIRO
const SUPERCELL = "inbox.supercell.com";
const DEFAULTS = {
  brawlstars: { uri: `https://brawlstars.${SUPERCELL}/xdjcscmv3zo3/7fPVu5gMJtGLdZCSR3jaeB/0ac6811bdbc95e1cdce94f63d3b0cb2d/Thumbnail.png`, fit: "cover" },
  clashroyale: { uri: `https://clashroyale.${SUPERCELL}/9jtsgmsiuthj/5uVxnmkg6ijzOVFl8cd9b0/1ce8c865928f89c695c6140f9597f8b5/HeroElectroWizard_ArticleHeroImage_1440x810.jpg`, fit: "cover" },
  clashofclans: { uri: `https://clashofclans.${SUPERCELL}/lqe2co20rkhw/hbUILQfMK7pYhleJgrPiP/351d03ad62cf1ba750bd0208782552a5/20250918_-_Inbox_Thumbnail_evergreenV1_900x506.png`, fit: "cover" },
  dota2: { uri: STEAM(570), fit: "cover" },
  apex: { uri: STEAM(1172470), fit: "cover" },
  pubg: { uri: STEAM(578080), fit: "cover" },
};
// Juegos cuyo main se usa de fondo y cómo: el banner de Apex ya es una ilustración; el héroe de Dota 2 es un recorte
const MAIN_FIT = { apex: "cover", dota2: "hero" };
let fortniteArt = null;    // promesa del arte de la temporada (noticias de fortnite-api.com, sin key)
let wildriftArt = null;    // promesa del arte del último parche de Wild Rift (noticias de la web oficial, vía el backend)

// Valorant: un agente distinto cada día (retratos recortados de valorant-api.com, pública y sin key)
const VALORANT_AGENTS = [
  "add6443a-41bd-e414-f6ad-e58d267f4e95",   // Jett
  "a3bfb853-43b2-7238-a4f1-ad90e9e46bcc",   // Reyna
  "eb93336a-449b-9c1b-0a54-a891f7921d69",   // Phoenix
  "f94c3b30-42be-e959-889c-5aa313dba261",   // Raze
  "569fdd95-4d10-43ab-ca70-79becc718b46",   // Sage
  "bb2a4828-46eb-8cd1-e765-15848195d751",   // Neon
];
const agentArt = id => `https://media.valorant-api.com/agents/${id}/fullportrait.png`;

async function lolLike(gameId, rotation) {
  let champ = await loadMainChampion(gameId);
  if (!champ && rotation) {
    const r = await rotation().catch(() => null);
    champ = championByKey(r?.free?.[0])?.id || null;
  }
  return champ ? championArt(champ) : null;
}

export async function homeArtFor(gameId, { region, rotation }) {
  if (gameId === "lol" || gameId === "tft") {
    const art = await lolLike(gameId, () => rotation(region));
    return art ? { ...art, fit: "cover" } : null;
  }
  // Wild Rift: el arte oficial del último parche (cambia con cada parche); si no llega, el splash de Yasuo
  if (gameId === "wildrift") {
    wildriftArt = wildriftArt || createGameApi("wildrift").get("/news", { lang: "en" })
      .then(n => n.items?.find(i => i.patch && i.image)?.image || null)
      .catch(() => { wildriftArt = null; return null; });
    const img = await wildriftArt;
    const yasuo = championSplash("Yasuo");
    // El CDN de Riot redimensiona: a 1080 de ancho pesa ~55 KB en vez de ~140 KB
    return img ? { uri: `${img}${img.includes("?") ? "&" : "?"}w=1080&q=80`, fallback: yasuo, fit: "cover", vivid: true } : { uri: yasuo, fit: "cover" };
  }
  // Valorant: el agente del día, grande a la derecha y con el brillo rojo del juego
  if (gameId === "valorant") {
    const day = Math.floor(Date.now() / 86400000);
    return { uri: agentArt(VALORANT_AGENTS[day % VALORANT_AGENTS.length]), fallback: agentArt(VALORANT_AGENTS[0]), fit: "agent", glow: "#FF4655", vivid: true };
  }
  const main = await loadMainChampion(gameId);
  if (gameId === "fortnite") {
    // Las noticias de la temporada traen arte oficial a 1920x1080; se pide a 1024 de ancho para que cargue rápido
    fortniteArt = fortniteArt || axios.get("https://fortnite-api.com/v2/news/br", { timeout: 8000 })
      .then(({ data }) => {
        const img = (data?.data?.motds || []).find(m => m.image)?.image;
        return img ? img.replace(/width=\d+&height=\d+/, "width=1024&height=576") : null;
      })
      .catch(() => { fortniteArt = null; return null; });
    const uri = await fortniteArt;
    return uri ? { uri, fit: "cover" } : { logo: true };
  }
  // Dota 2 (héroe más jugado) y Apex (banner de la leyenda): el main ya es una URL
  if (MAIN_FIT[gameId] && typeof main === "string" && /^https:\/\//.test(main)) return { uri: main, fit: MAIN_FIT[gameId] };
  return DEFAULTS[gameId] || { logo: true };
}
