import React, { useCallback, useEffect, useRef, useState } from "react";
import FluidBanner from "./banner/FluidBanner";
import { LiveIndicator, LiveListSheet } from "./LiveIndicator";
import { useLiveFavorites } from "./useLiveFavorites";
import { useNotifications } from "./NotificationsProvider";
import { onLive } from "./events";
import { useT } from "../i18n/I18nProvider";
import { navigateWhenReady } from "../navigation/ref";
import { loadFavorites } from "../utils/favorites";
import { championByKey, championIcon, championLabel, profileIconUrl } from "../api/ddragon";
import { getLive } from "../games/lol/api";
import { queueLabel } from "../games/lol/utils";

const MAX_QUEUE = 5;   // si llegan muchos avisos seguidos, solo se conservan los más recientes

// Datos que se pueden armar al instante (sin red) a partir del aviso
function baseItem(event, fav) {
  const riotName = (event.data?.riotId || "").split("#")[0];
  const name = riotName || fav?.gameName || event.title;
  const iconId = event.data?.iconId ?? fav?.iconId ?? null;
  return {
    id: event.id, kind: event.kind, data: event.data || {}, name,
    live: event.kind === "start",
    // al entrar en partida el título es el nombre; al terminar, el resultado ("Faker ganó con Ahri")
    heading: event.kind === "start" ? name : event.title,
    subtitle: event.body,
    avatarUri: iconId != null ? profileIconUrl(iconId) : null,
    badgeUri: null,
  };
}

/**
 * Muestra los avisos que llegan con la app abierta como banner fluido (uno tras otro, en cola) y mantiene el
 * indicador persistente "N en vivo". Se monta una sola vez, encima de la navegación.
 */
export default function BannerHost() {
  const t = useT();
  const { supported, favoritesVersion } = useNotifications();
  const { live, apply } = useLiveFavorites(favoritesVersion);
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [listOpen, setListOpen] = useState(false);
  const seen = useRef(new Set());

  // Completa el aviso con lo que hay que pedir al servidor: el campeón que juega y la cola
  const enrich = useCallback(async item => {
    const patch = {};
    try {
      if (item.data.demo) {
        const champ = championByKey(item.data.championId);
        if (champ) patch.badgeUri = championIcon(champ.name);
        patch.subtitle = t("notif.banner.sub", { queue: queueLabel(item.data.queueId), champion: champ ? championLabel(champ.name) : "" });
      } else if (item.kind === "start" && item.data.puuid) {
        const game = await getLive(item.data.puuid, item.data.region);
        if (game?.inGame) {
          const me = (game.participants || []).find(p => p.puuid === item.data.puuid);
          const champ = championByKey(me?.championId);
          if (champ) patch.badgeUri = championIcon(champ.name);
          patch.subtitle = t("notif.banner.sub", { queue: queueLabel(game.queueId), champion: champ ? championLabel(champ.name) : "" });
        }
      }
    } catch (e) {
      console.warn("No se pudo completar el aviso:", e.message);   // se queda con lo básico
    }
    if (Object.keys(patch).length) {
      setCurrent(c => (c && c.id === item.id ? { ...c, ...patch } : c));
      setQueue(q => q.map(x => (x.id === item.id ? { ...x, ...patch } : x)));
    }
  }, [t]);

  useEffect(() => onLive(async event => {
    if (seen.current.has(event.id)) return;   // el mismo aviso no se muestra dos veces
    seen.current.add(event.id);
    const fav = (await loadFavorites().catch(() => [])).find(f => f.puuid === event.data?.puuid);
    const item = baseItem(event, fav);
    apply({ ...event, name: item.name });
    setQueue(q => [...q, item].slice(-MAX_QUEUE));
    enrich(item);
  }), [apply, enrich]);

  // Cuando no hay banner en pantalla se pasa al siguiente de la cola
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
  }, [current, queue]);

  const open = useCallback(item => {
    if (item.data?.puuid && item.data.puuid !== "demo") navigateWhenReady("LiveGame", { puuid: item.data.puuid, region: item.data.region, riotId: item.data.riotId });
  }, []);

  const openFromList = useCallback(l => {
    setListOpen(false);
    navigateWhenReady("LiveGame", { puuid: l.puuid, region: l.region, riotId: l.riotId });
  }, []);

  if (!supported) return null;
  return (
    <>
      <LiveIndicator live={live} hidden={Boolean(current)} onPress={() => setListOpen(true)} />
      {current ? <FluidBanner key={current.id} item={current} onDone={() => setCurrent(null)} onOpen={open} /> : null}
      <LiveListSheet visible={listOpen} live={live} onClose={() => setListOpen(false)} onOpen={openFromList} />
    </>
  );
}
