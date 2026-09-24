import * as Font from "expo-font";
import { initDataDragon } from "../api/ddragon";
import { pingServer } from "../api/client";
import { migrateLegacyStorage } from "../utils/storage";
import { loadFavorites } from "../utils/favorites";
import { loadActiveGame, loadRegion } from "../utils/prefs";
import { getGameMeta } from "../games/registry";
import { DEFAULT_REGION } from "../constants/regions";
import { fontAssets } from "../theme";

// Cada tarea avanza la barra de carga un 100/N %. Si una falla, se usa `fallback` y el arranque sigue.
export const BOOT_TASKS = [
  {
    key: "fonts",
    run: () => Font.loadAsync(fontAssets),
    fallback: null,
  },
  {
    key: "dataDragon",
    run: initDataDragon,
    fallback: null,
  },
  {
    key: "favorites",
    // Migra las claves antiguas y los favoritos sin gameId/región (se guardan ya migrados)
    run: async () => {
      await migrateLegacyStorage();
      return loadFavorites();
    },
    fallback: [],
  },
  {
    key: "prefs",
    // Último juego y última región usados
    run: async () => {
      const [saved, region] = await Promise.all([loadActiveGame(), loadRegion()]);
      const meta = getGameMeta(saved);
      return { activeGame: meta?.available ? saved : "lol", region };
    },
    fallback: { activeGame: "lol", region: DEFAULT_REGION },
  },
  {
    key: "server",
    // Que el backend no responda no es un error de arranque: se avisa en Home
    run: () => pingServer().then(() => true, () => false),
    fallback: false,
  },
];

export const TASK_TIMEOUT_MS = 6000;
