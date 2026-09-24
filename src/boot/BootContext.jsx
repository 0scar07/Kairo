import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { pingServer } from "../api/client";
import { DEFAULT_REGION } from "../constants/regions";
import { saveRegion, saveHaptics } from "../utils/prefs";
import { setHapticsEnabled } from "../utils/haptics";

const BootContext = createContext({
  favorites: [], recents: [], region: DEFAULT_REGION, setRegion: () => {},
  haptics: true, setHaptics: () => {}, serverOnline: true, retryServer: async () => {},
});

// Datos que dejó el arranque y preferencias del usuario, disponibles para las pantallas
export function BootProvider({ boot, children }) {
  const [serverOnline, setServerOnline] = useState(boot.server !== false);
  const [region, setRegionState] = useState(boot.prefs?.region || DEFAULT_REGION);
  const [haptics, setHapticsState] = useState(boot.prefs?.haptics !== false);

  useEffect(() => { setHapticsEnabled(haptics); }, []);

  const retryServer = useCallback(async () => {
    try {
      await pingServer();
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
    }),
    [boot, region, haptics, serverOnline, setRegion, setHaptics, retryServer]
  );
  return <BootContext.Provider value={value}>{children}</BootContext.Provider>;
}

export const useBootData = () => useContext(BootContext);
