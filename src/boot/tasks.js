import * as Font from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initDataDragon } from "../api/ddragon";
import { pingServer } from "../api/riot";
import { migrateLegacyStorage } from "../utils/storage";
import { FAVORITES_KEY, ACTIVE_GAME_KEY } from "../constants/config";
import { fontAssets, accents } from "../theme";

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
    run: async () => {
      await migrateLegacyStorage();
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      // Los favoritos antiguos de LoL no tenían campo game
      return raw ? JSON.parse(raw).map(f => ({ ...f, game: f.game || "lol" })) : [];
    },
    fallback: [],
  },
  {
    key: "activeGame",
    run: async () => {
      const saved = await AsyncStorage.getItem(ACTIVE_GAME_KEY);
      return saved && accents[saved] && saved !== "brand" ? saved : "lol";
    },
    fallback: "lol",
  },
  {
    key: "server",
    // Que el backend no responda no es un error de arranque: se avisa en Home
    run: () => pingServer().then(() => true, () => false),
    fallback: false,
  },
];

export const TASK_TIMEOUT_MS = 6000;
