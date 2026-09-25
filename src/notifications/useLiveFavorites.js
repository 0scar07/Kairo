import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { alertFavorites, loadFavorites } from "../utils/favorites";
import { getLive } from "../games/lol/api";
import { PREVIEW, pushSupported } from "./env";

const MAX_WATCHED = 10;          // favoritos consultados a la vez (cada consulta pasa por la caché del servidor)
const REFRESH_MS = 120_000;
const STALE_MS = 4 * 60 * 60_000;   // una partida de LoL no dura más; así un "fin" perdido no deja el indicador para siempre

/**
 * Qué favoritos con alertas están en partida ahora: { [puuid]: { puuid, region, name, iconId, queueId, since } }.
 * Se alimenta de dos fuentes: las notificaciones que llegan con la app abierta (`apply`) y una consulta al servidor al
 * abrir la app, al volver a ella, al cambiar los favoritos y cada 2 minutos mientras está activa.
 */
export function useLiveFavorites(favoritesVersion) {
  const [live, setLive] = useState({});
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (!pushSupported || PREVIEW || busy.current) return;
    busy.current = true;
    try {
      const favs = alertFavorites(await loadFavorites()).slice(0, MAX_WATCHED);
      const results = await Promise.allSettled(favs.map(f => getLive(f.puuid, f.region)));
      const next = {};
      results.forEach((r, i) => {
        if (r.status !== "fulfilled" || !r.value?.inGame) return;
        const f = favs[i];
        next[f.puuid] = { puuid: f.puuid, region: f.region, riotId: `${f.gameName}#${f.tagLine}`, name: f.gameName, iconId: f.iconId ?? null, queueId: r.value.queueId, since: Date.now() };
      });
      setLive(next);
    } catch (e) {
      console.warn("No se pudo consultar quién está en partida:", e.message);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => { refresh(); }, [favoritesVersion, refresh]);

  useEffect(() => {
    if (!pushSupported || PREVIEW) return undefined;
    const timer = setInterval(() => { if (AppState.currentState === "active") refresh(); }, REFRESH_MS);
    const sub = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [refresh]);

  // Una notificación con la app abierta: al entrar en partida se añade, al terminar se quita
  const apply = useCallback(event => {
    const { puuid } = event.data || {};
    if (!puuid) return;
    setLive(prev => {
      if (event.kind === "end") return Object.fromEntries(Object.entries(prev).filter(([id]) => id !== puuid));
      if (event.kind === "start") {
        return { ...prev, [puuid]: { puuid, region: event.data.region, riotId: event.data.riotId, name: event.name, iconId: event.data.iconId ?? null, queueId: event.data.queueId ?? null, since: Date.now() } };
      }
      return prev;
    });
  }, []);

  // Descarta las partidas demasiado viejas para ser reales
  const fresh = Object.values(live).filter(l => Date.now() - l.since < STALE_MS);
  return { live: fresh, refresh, apply };
}
