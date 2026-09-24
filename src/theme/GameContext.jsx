import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { saveActiveGame } from "../utils/prefs";
import { accents, mixHex } from "./colors";

const TRANSITION_MS = 350;

const GameContext = createContext({ gameId: "lol", accent: accents.brand, setGameId: () => {} });

// Guarda el juego activo (y lo recuerda entre sesiones). Al cambiar de juego el acento
// se interpola de un color al otro, así tabs, botones y barras cambian con suavidad.
export function GameProvider({ initialGame = "lol", children }) {
  const [gameId, setId] = useState(initialGame);
  const [accent, setAccent] = useState(accents[initialGame] || accents.brand);
  const current = useRef(accent);
  const frame = useRef(null);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const setGameId = useCallback(id => {
    setId(id);
    saveActiveGame(id).catch(e => console.warn("No se pudo guardar el juego:", e.message));

    cancelAnimationFrame(frame.current);
    const from = current.current;
    const to = accents[id] || accents.brand;
    const start = Date.now();
    const step = () => {
      const t = Math.min((Date.now() - start) / TRANSITION_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = mixHex(from, to, eased);
      setAccent(current.current);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, []);

  const value = useMemo(() => ({ gameId, accent, setGameId }), [gameId, accent, setGameId]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export const useActiveGame = () => useContext(GameContext);

// Acento de un juego concreto; sin argumento, el del juego activo (con la transición animada)
export function useAccent(gameId) {
  const { accent } = useContext(GameContext);
  return gameId ? accents[gameId] || accents.brand : accent;
}
