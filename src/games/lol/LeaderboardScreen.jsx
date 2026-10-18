import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useT } from "../../i18n/I18nProvider";
import { ErrorState, RowSkeleton } from "../../components/ui";
import { LeaderboardHead, LeaderboardRow } from "./components/LeaderboardTable";
import { getLeaderboard } from "./api";
import { getRegion } from "../../constants/regions";
import { errorMessage, tierLabel } from "../../utils/format";
import { colors, radii, sizes, spacing, type, useAccent } from "../../theme";

const PAGE = 50;   // el backend sirve hasta 50 por página

// Ranking completo de una región (desde la hoja Explorar): params { region, tier, queue }. Carga más al llegar al final.
export default function LeaderboardScreen({ route, navigation }) {
  const t = useT();
  const accent = useAccent("lol");
  const { region, tier, queue } = route.params;
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(null);
  const [status, setStatus] = useState("loading");   // loading | ready | error
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);   // onEndReached puede dispararse dos veces antes de que el estado se actualice

  useLayoutEffect(() => {
    navigation.setOptions({ title: `${tierLabel(tier.toUpperCase())} · ${getRegion(region).label}` });
  }, [navigation, tier, region]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await getLeaderboard(region, { tier, queue, limit: PAGE });
      setPlayers(r.players);
      setTotal(r.total);
      setStatus("ready");
    } catch (e) {
      setError(errorMessage(e));
      setStatus("error");
    }
  }, [region, tier, queue]);
  useEffect(() => { load(); }, [load]);

  async function more() {
    if (busy.current || status !== "ready" || (total != null && players.length >= total)) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const r = await getLeaderboard(region, { tier, queue, start: players.length, limit: PAGE });
      setPlayers(prev => [...prev, ...r.players.filter(p => !prev.some(x => x.puuid === p.puuid))]);
      if (r.total != null) setTotal(r.total);
    } catch (e) {
      console.warn("No se pudo cargar más del ranking:", e.message);
    }
    busy.current = false;
    setLoadingMore(false);
  }

  if (status === "error") return <View style={styles.center}><ErrorState message={t("explore.rankingError", { error })} onRetry={load} /></View>;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={status === "ready" ? players : []}
      keyExtractor={p => p.puuid}
      ListHeaderComponent={(
        <>
          <Text style={styles.sub}>{queue === "RANKED_FLEX_SR" ? t("ranked.flex") : t("ranked.solo")}{total ? ` · ${t("explore.positions", { count: total })}` : ""}</Text>
          <View style={styles.top}><LeaderboardHead /></View>
          {status === "loading" ? <><RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton /></> : null}
        </>
      )}
      renderItem={({ item, index }) => (
        <LeaderboardRow
          player={item}
          position={index + 1}
          onPress={() => navigation.navigate("Profile", { gameId: "lol", gameName: item.gameName, tagLine: item.tagLine, region })}
        />
      )}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={accent} style={styles.loader} /> : <View style={styles.bottom} />}
      onEndReached={more}
      onEndReachedThreshold={0.4}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxxl },
  center:    { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  sub:       { ...type.small, color: colors.textMuted, marginBottom: spacing.md },
  top:       { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, overflow: "hidden", borderWidth: sizes.hairline, borderBottomWidth: 0, borderColor: colors.border },
  loader:    { marginVertical: spacing.lg },
  bottom:    { height: spacing.lg },
});
