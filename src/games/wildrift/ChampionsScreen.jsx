import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Platform, StyleSheet } from "react-native";
import { Chip, EmptyState, ErrorState, Skeleton } from "../../components/ui";
import Icon from "../../components/Icon";
import { Portrait } from "./components";
import { LANES, LANE_LABEL, champIcon, champName, championsOf, getMeta } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage } from "../../utils/format";
import { colors, fontSizes, radii, sizes, spacing, type, withAlpha, accents } from "../../theme";

const ACCENT = accents.wildrift;
// Sin tildes ni mayúsculas, para buscar "kaisa" y encontrar a Kai'Sa
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();

/**
 * Todos los campeones con datos en Diamante+, de la A a la Z, con buscador y filtro por carril. También sirve para
 * elegir campeones del comparador:
 *  - params.pick = "compareA": se elige el primero y se pasa a elegir el segundo
 *  - params.pick = "compareB" (+ a, lane?, rank?): se elige el segundo y se abre la comparación
 */
export default function ChampionsScreen({ route, navigation }) {
  const t = useT();
  const pick = route.params?.pick || null;
  const [state, setState] = useState({ status: "loading" });
  const [query, setQuery] = useState("");
  const [lane, setLane] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({ title: pick === "compareA" ? t("wr.pickFirst") : pick === "compareB" ? t("wr.pickSecond") : t("wr.champions") });
  }, [pick]);

  useEffect(() => {
    let alive = true;
    getMeta("diamond")
      .then(meta => { if (alive) setState({ status: "ready", meta }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [attempt]);

  const list = useMemo(() => {
    if (!state.meta) return [];
    // Con un carril elegido se muestra cada campeón en ese carril; sin carril, en su mejor carril
    const base = lane ? (state.meta.lanes[lane] || []).map(e => ({ ...e, lane })) : championsOf(state.meta);
    const q = fold(query);
    return base
      .filter(c => c.heroId !== route.params?.a)
      .filter(c => !q || fold(champName(c)).includes(q) || fold(c.key).includes(q))
      .sort((a, b) => champName(a).localeCompare(champName(b)));
  }, [state.meta, lane, query]);

  function choose(c) {
    if (pick === "compareA") navigation.push("WRChampions", { pick: "compareB", a: c.heroId });
    else if (pick === "compareB") navigation.replace("WRCompare", { a: route.params.a, b: c.heroId, lane: route.params.lane || c.lane, rank: route.params.rank });
    else navigation.navigate("WRChampion", { heroId: c.heroId, lane: c.lane });
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.field}>
          <Icon name="search" size={fontSizes.lg} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("wr.searchChamp")}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={t("wr.searchChamp")}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lanes} keyboardShouldPersistTaps="handled">
          <Chip label={t("wr.allLanes")} active={!lane} onPress={() => setLane(null)} game="wildrift" />
          {LANES.map(l => <Chip key={l} label={t(LANE_LABEL[l])} active={lane === l} onPress={() => setLane(lane === l ? null : l)} game="wildrift" />)}
        </ScrollView>
      </View>

      {state.status === "loading" ? (
        <View style={styles.grid}>{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} width={sizes.avatarLg + spacing.sm} height={sizes.avatarLg + spacing.sm} radius={radii.md} style={styles.skel} />)}</View>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {pick ? <Text style={styles.hint}>{pick === "compareA" ? t("wr.pickFirstHint") : t("wr.pickSecondHint")}</Text> : null}
          {list.length ? (
            <View style={styles.grid}>
              {list.map(c => (
                <Portrait key={`${c.heroId}-${c.lane}`} uri={champIcon(c)} tier={c.tier} label={champName(c)} sub={`${c.winRate?.toFixed(1)}%`} onPress={() => choose(c)} />
              ))}
            </View>
          ) : (
            <EmptyState compact icon="search" title={t("wr.noChamp")} />
          )}
          <Text style={styles.source}>{t("wr.champsNote")}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  top:       { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  field:     { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: sizes.avatarLg + spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.35), backgroundColor: colors.surface },
  input:     { flex: 1, minWidth: 0, ...type.body, color: colors.text, height: "100%", ...(Platform.OS === "web" ? { outlineStyle: "none" } : null) },
  lanes:     { paddingVertical: spacing.sm },
  content:   { paddingHorizontal: spacing.lg, paddingBottom: spacing.hero },
  hint:      { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, rowGap: spacing.md },
  skel:      { margin: spacing.xs },
  source:    { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
