import * as Font from "expo-font";
import { initDataDragon } from "../api/ddragon";
import { pingServer } from "../api/client";
import { migrateLegacyStorage } from "../utils/storage";
import { loadFavorites } from "../utils/favorites";
import { loadActiveGame, loadRegion, loadHaptics } from "../utils/prefs";
import { loadRecents } from "../utils/recents";
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
    // Último juego, última región y vibración
    run: async () => {
      const [saved, region, haptics] = await Promise.all([loadActiveGame(), loadRegion(), loadHaptics()]);
      const meta = getGameMeta(saved);
      return { activeGame: meta?.available ? saved : "lol", region, haptics };
    },
    fallback: { activeGame: "lol", region: DEFAULT_REGION, haptics: true },
  },
  {
    key: "recents",
    run: loadRecents,
    fallback: [],
  },
  {
    key: "server",
    // Que el backend no responda no es un error de arranque: se avisa en Home
    run: () => pingServer().then(health => ({ ok: true, games: health.games || {} }), () => ({ ok: false, games: {} })),
    fallback: { ok: false, games: {} },
  },
];

export const TASK_TIMEOUT_MS = 6000;
