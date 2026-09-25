import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { Card, EmptyState, ErrorState, PressableScale, Skeleton } from "../components/ui";
import Icon from "../components/Icon";
import { getGame } from "../games";
import { errorMessage } from "../utils/format";
import { useT } from "../i18n/I18nProvider";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../theme";

/**
 * Resultados de buscar un jugador por nombre (para los juegos donde el nombre se repite, como Dota 2).
 * params: { gameId, query, region }. Cada resultado abre el perfil por su ID.
 */
export default function SearchResultsScreen({ route, navigation }) {
  const t = useT();
  const { gameId, query, region } = route.params;
  const game = getGame(gameId);
  const accent = useAccent(gameId);
  const [state, setState] = useState({ status: "loading" });   // loading | ready | error

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: "loading" });
    game.api.find(query, region)
      .then(items => { if (!cancelled) setState({ status: "ready", items }); })
      .catch(e => { if (!cancelled) setState({ status: "error", message: errorMessage(e, t("search.error")) }); });
    return () => { cancelled = true; };
  }, [gameId, query, region]);

  useEffect(load, [load]);

  if (state.status === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} height={sizes.iconHero - spacing.xl} radius={radii.lg} style={styles.gap} />)}
        </View>
      </View>
    );
  }
  if (state.status === "error") {
    return <View style={styles.center}><ErrorState message={state.message} onRetry={load} /></View>;
  }
  if (!state.items.length) {
    return <View style={styles.center}><EmptyState icon="search" title={t("search.emptyTitle")} text={t("search.emptyText")} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>{t("search.hint", { count: state.items.length, query })}</Text>
      {state.items.map(item => (
        <PressableScale
          key={item.id}
          haptic
          scaleTo={0.985}
          style={styles.gap}
          onPress={() => navigation.navigate("Profile", { gameId, gameName: item.id, tagLine: "", region })}
        >
          <Card style={styles.row}>
            {item.avatar
              ? <Image source={{ uri: item.avatar }} style={[styles.avatar, { borderColor: accent }]} />
              : <View style={[styles.avatar, { borderColor: accent }]} />}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
            </View>
            <Icon name="chevron" size={sizes.item - spacing.xs} color={withAlpha(accent, 0.9)} />
          </Card>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxxl },
  center:    { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  gap:       { marginBottom: spacing.md },
  hint:      { ...type.caption, color: colors.textMuted, marginBottom: spacing.md },
  row:       { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: 0 },
  avatar:    { width: sizes.avatarXl - spacing.md, height: sizes.avatarXl - spacing.md, borderRadius: radii.pill, borderWidth: sizes.borderThick, backgroundColor: colors.surfaceHigh },
  info:      { flex: 1, minWidth: 0 },
  name:      { ...type.bodyStrong, color: colors.text },
  subtitle:  { ...type.caption, color: colors.textMuted },
});
