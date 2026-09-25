import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { pingServer } from "../api/client";
import { DEFAULT_REGION } from "../constants/regions";
import { saveRegion, saveHaptics } from "../utils/prefs";
import { setHapticsEnabled } from "../utils/haptics";
import { touchFavoritesHistory } from "../utils/historyTouch";

const BootContext = createContext({
  favorites: [], recents: [], region: DEFAULT_REGION, setRegion: () => {},
  haptics: true, setHaptics: () => {}, serverOnline: true, retryServer: async () => {},
  gameEnabled: () => true,
});

// Datos que dejó el arranque y preferencias del usuario, disponibles para las pantallas
export function BootProvider({ boot, children }) {
  const [serverOnline, setServerOnline] = useState(boot.server?.ok !== false);
  // Juegos que la key del servidor puede consultar ({ lol: true, tft: false }); sin datos, todos se asumen disponibles
  const [games, setGames] = useState(boot.server?.games || {});
  const [region, setRegionState] = useState(boot.prefs?.region || DEFAULT_REGION);
  const [haptics, setHapticsState] = useState(boot.prefs?.haptics !== false);

  useEffect(() => { setHapticsEnabled(haptics); }, []);
  useEffect(() => { touchFavoritesHistory().catch(e => console.warn("Historial de favoritos:", e.message)); }, []);

  const retryServer = useCallback(async () => {
    try {
      const health = await pingServer();
      setGames(health.games || {});
      setServerOnline(true);
    } catch (e) {
      setServerOnline(false);
    }
  }, []);

  const setRegion = useCallback(id => {
    setRegionState(id);
    saveRegion(id).catch(e => console.warn("No se pudo guardar la región:", e.message));
  }, []);

  const setHaptics = useCallback(enabled => {
    setHapticsState(enabled);
    setHapticsEnabled(enabled);
    saveHaptics(enabled).catch(e => console.warn("No se pudo guardar la vibración:", e.message));
  }, []);

  const value = useMemo(
    () => ({
      favorites: boot.favorites || [],
      recents: boot.recents || [],
      region, setRegion, haptics, setHaptics,
      serverOnline, retryServer,
      gameEnabled: id => games[id] !== false,
    }),
    [boot, region, haptics, serverOnline, games, setRegion, setHaptics, retryServer]
  );
  return <BootContext.Provider value={value}>{children}</BootContext.Provider>;
}

export const useBootData = () => useContext(BootContext);
