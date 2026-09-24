import lol from "./lol";
import tft from "./tft";
import brawlstars from "./brawlstars";
import clashroyale from "./clashroyale";
import clashofclans from "./clashofclans";
import valorant from "./valorant/meta";

/**
 * Registro de juegos. Para añadir uno: crear src/games/<id>/ con meta.js e index.js,
 * registrarlo en registry.js (metadatos) y aquí (módulo completo).
 *
 * Un módulo de juego exporta:
 *  - id, name, short, accent, placeholder            (de meta.js)
 *  - api.search(gameName, tagLine, region) -> data          datos del perfil (incluye account, region…)
 *  - getProfile(data) -> { avatar, name, tag, subtitle, ranked, badge? }   cabecera del perfil (badge: texto si no hay rango)
 *  - toFavorite(data) -> { puuid, gameName, tagLine, iconId | iconUrl, tier, rank, label? }
 *  - meta.tagSearch / meta.hasRegion: juegos que se buscan solo por tag y no tienen regiones (Supercell)
 *  - ProfileBody({ data, setData, setError, mine })         contenido propio del juego
 *  - HomeExtras({ region })                                 (opcional) extras de Inicio propios del juego
 */
export const GAMES = [lol, tft, brawlstars, clashroyale, clashofclans];

// Juegos anunciados que aún no están disponibles (se muestran como "Próximamente")
export const UPCOMING_GAMES = [valorant];

export const getGame = id => GAMES.find(g => g.id === id);
