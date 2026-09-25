import React, { useCallback, useEffect, useState } from "react";
import { useT } from "../i18n/I18nProvider";
import { View, StyleSheet } from "react-native";
import ProfileView from "../components/ProfileView";
import ProfileSkeleton from "../components/ProfileSkeleton";
import { ErrorState } from "../components/ui";
import { getGame } from "../games";
import { errorMessage } from "../utils/format";
import { addRecent } from "../utils/recents";
import { isOffline, loadCachedProfile, saveCachedProfile } from "../utils/profileCache";
import { colors } from "../theme";

/**
 * Perfil de un jugador buscado: params { gameId, gameName, tagLine, region }.
 * Muestra un esqueleto animado mientras carga y un error con botón de reintentar si falla.
 */
export default function ProfileScreen({ route }) {
  const t = useT();
  const { gameId, gameName, tagLine, region } = route.params;
  const game = getGame(gameId);
  const [state, setState] = useState({ status: "loading" });   // loading | ready | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    game.api.search(gameName, tagLine, region)
      .then(data => {
        if (cancelled) return;
        setState({ status: "ready", data });
        saveCachedProfile(gameId, region, data.account.gameName, data.account.tagLine, data)
          .catch(e => console.warn("No se pudo guardar la copia local del perfil:", e.message));
        addRecent({ gameId, region, gameName: data.account.gameName, tagLine: data.account.tagLine, lookup: data.account.lookup })
          .catch(e => console.warn("No se pudo guardar la búsqueda reciente:", e.message));
      })
      .catch(async e => {
        if (cancelled) return;
        // Sin conexión: se muestra lo último que se guardó de este jugador, si lo hay
        if (isOffline(e)) {
          const cached = await loadCachedProfile(gameId, region, gameName, tagLine);
          if (cached && !cancelled) { setState({ status: "ready", data: cached.data, offlineAt: cached.at }); return; }
        }
        setState({ status: "error", message: errorMessage(e, t("profile.loadError")) });
      });
    return () => { cancelled = true; };
  }, [gameId, gameName, tagLine, region, attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  if (state.status === "ready") return <ProfileView gameId={gameId} initialData={state.data} offlineAt={state.offlineAt} />;
  if (state.status === "error") {
    return <View style={styles.center}><ErrorState message={state.message} onRetry={retry} /></View>;
  }
  return <ProfileSkeleton />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
});
