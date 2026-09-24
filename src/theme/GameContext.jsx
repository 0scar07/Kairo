import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ACTIVE_GAME_KEY } from "../constants/config";
import { accents } from "./colors";

const GameContext = createContext({ gameKey: "lol", setGameKey: () => {} });

// Guarda el juego activo (y lo recuerda entre sesiones); tabs, botones y barras toman su color de aquí
export function GameProvider({ initialGame = "lol", children }) {
  const [gameKey, setKey] = useState(initialGame);

  const setGameKey = useCallback(key => {
    setKey(key);
    AsyncStorage.setItem(ACTIVE_GAME_KEY, key).catch(e => console.warn("No se pudo guardar el juego:", e.message));
  }, []);

  const value = useMemo(() => ({ gameKey, setGameKey }), [gameKey, setGameKey]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export const useActiveGame = () => useContext(GameContext);

// Color de acento de un juego; sin argumento usa el del juego activo
export function useAccent(gameKey) {
  const { gameKey: active } = useContext(GameContext);
  return accents[gameKey || active] || accents.brand;
}
