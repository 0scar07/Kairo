import React, { createContext, useContext, useMemo, useState } from "react";
import { accents } from "./colors";

const GameContext = createContext({ gameKey: "lol", setGameKey: () => {} });

// Guarda el juego activo; tabs, botones y barras toman su color de aquí
export function GameProvider({ initialGame = "lol", children }) {
  const [gameKey, setGameKey] = useState(initialGame);
  const value = useMemo(() => ({ gameKey, setGameKey }), [gameKey]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export const useActiveGame = () => useContext(GameContext);

// Color de acento de un juego; sin argumento usa el del juego activo
export function useAccent(gameKey) {
  const { gameKey: active } = useContext(GameContext);
  return accents[gameKey || active] || accents.brand;
}
