// Metadatos de todos los juegos (sin dependencias, para que el tema pueda importarlos sin ciclos).
import lol from "./lol/meta";
import tft from "./tft/meta";
import valorant from "./valorant/meta";

export const GAME_META = [lol, tft, valorant];

export const getGameMeta = id => GAME_META.find(g => g.id === id);
