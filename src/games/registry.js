// Metadatos de todos los juegos (sin dependencias, para que el tema pueda importarlos sin ciclos).
import lol from "./lol/meta";
import tft from "./tft/meta";
import brawlstars from "./brawlstars/meta";
import clashroyale from "./clashroyale/meta";
import clashofclans from "./clashofclans/meta";
import dota2 from "./dota2/meta";
import fortnite from "./fortnite/meta";
import apex from "./apex/meta";
import pubg from "./pubg/meta";
import valorant from "./valorant/meta";

export const GAME_META = [lol, tft, brawlstars, clashroyale, clashofclans, dota2, fortnite, apex, pubg, valorant];

export const getGameMeta = id => GAME_META.find(g => g.id === id);
