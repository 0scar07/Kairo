import axios from "axios";
import { championArt, championByKey } from "../api/ddragon";
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
