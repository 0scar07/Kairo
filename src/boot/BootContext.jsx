import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { pingServer } from "../api/client";
import { DEFAULT_REGION } from "../constants/regions";

const BootContext = createContext({
  favorites: [], region: DEFAULT_REGION, serverOnline: true, retryServer: async () => {},
});

// Datos que dejó el arranque, disponibles para las pantallas
export function BootProvider({ boot, children }) {
  const [serverOnline, setServerOnline] = useState(boot.server !== false);

  const retryServer = useCallback(async () => {
    try {
      await pingServer();
      setServerOnline(true);
    } catch (e) {
      setServerOnline(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      favorites: boot.favorites || [],
      region: boot.prefs?.region || DEFAULT_REGION,
      serverOnline,
      retryServer,
    }),
    [boot, serverOnline, retryServer]
  );
  return <BootContext.Provider value={value}>{children}</BootContext.Provider>;
}

export const useBootData = () => useContext(BootContext);
