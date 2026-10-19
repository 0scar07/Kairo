import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { Card, Chip, ErrorState, PressableScale, Skeleton } from "../../components/ui";
import Icon from "../../components/Icon";
import RankEmblem from "../../components/RankEmblem";
import { Shade, TierBadge } from "./components";
import { LANES, LANE_LABEL, RANKS, RANK_LABEL, champName, champSplash, getChampion } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage } from "../../utils/format";
import { accents, colors, fontSizes, radii, sizes, spacing, type, withAlpha } from "../../theme";

const ACCENT = accents.wildrift;
const SIDE_B = colors.loss;   // el campeón A usa el color de Wild Rift; el B, rojo (como los dos lados de un partido)
const EMBLEM = { diamond: "DIAMOND", master: "MASTER", challenger: "CHALLENGER", legend: "CHALLENGER" };
const pct = v => (v == null ? "—" : `${v.toFixed(1)}%`);

/** Una fila "valor A · nombre · valor B" con una barra partida según quién tiene más (o menos, en `lowerWins`) */
function StatRow({ label, a, b, format = pct, lowerWins }) {
  const has = a != null && b != null;
  const aWins = has && (lowerWins ? a < b : a > b);
  const bWins = has && (lowerWins ? b < a : b > a);
  const share = has && a + b > 0 ? (lowerWins ? b / (a + b) : a / (a + b)) : 0.5;
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <Text style={[styles.statValue, aWins && { color: ACCENT }]}>{format(a)}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, styles.right, bWins && { color: SIDE_B }]}>{format(b)}</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barA, { flex: share }]} />
        <View style={[styles.barB, { flex: 1 - share }]} />
      </View>
    </View>
  );
}

/**
 * Dos campeones lado a lado en el mismo carril y rango: tier, victorias, elección, baneo y puesto, y su winrate en
 * cada rango. Si no comparten carril, cada uno se muestra en el suyo (y se avisa).
 *  - params: { a, b, lane?, rank? }   (a y b son heroId)
 */
export default function CompareScreen({ route, navigation }) {
  const t = useT();
  const { a: idA, b: idB } = route.params;
  const [state, setState] = useState({ status: "loading" });
  const [rank, setRank] = useState(route.params.rank || "diamond");
  const [lane, setLane] = useState(route.params.lane || null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    Promise.all([getChampion(idA), getChampion(idB)])
      .then(([a, b]) => { if (alive) setState({ status: "ready", a, b }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [idA, idB, attempt]);

  if (state.status === "loading") {
    return <View style={[styles.container, styles.pad]}><Skeleton height={sizes.chart * 1.6} radius={radii.xl} style={styles.gap} /><Skeleton height={sizes.chart * 1.4} radius={radii.lg} style={styles.gap} /></View>;
  }
  if (state.status === "error") return <View style={styles.center}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /></View>;

  const { a, b } = state;
  const lanesOf = c => LANES.filter(l => RANKS.some(r => c.byRank?.[r]?.[l]));
  const shared = lanesOf(a).filter(l => lanesOf(b).includes(l));
  // Carril: el pedido si lo comparten; si no, el primero en común; si no hay ninguno, cada uno en el suyo
  const common = lane && shared.includes(lane) ? lane : shared[0] || null;
  const laneA = common || lanesOf(a)[0];
  const laneB = common || lanesOf(b)[0];
  const ea = a.byRank?.[rank]?.[laneA];
  const eb = b.byRank?.[rank]?.[laneB];

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.pad, styles.content]}>
      <View style={styles.vs}>
        {[[a, ea, laneA, ACCENT], [b, eb, laneB, SIDE_B]].map(([c, e, l, tone], i) => (
          <PressableScale key={i} onPress={() => navigation.navigate("WRChampion", { heroId: c.heroId, lane: l, rank })} scaleTo={0.97} style={[styles.side, { borderColor: withAlpha(tone, 0.5) }]} accessibilityRole="button" accessibilityLabel={champName(c)}>
            <Image source={{ uri: champSplash(c) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <Shade from={0} to={0.95} />
            <View style={styles.sideBody}>
              {e ? <TierBadge tier={e.tier} /> : null}
              <Text style={styles.sideName} numberOfLines={1}>{champName(c)}</Text>
              {!common ? <Text style={styles.sideLane}>{t(LANE_LABEL[l])}</Text> : null}
            </View>
          </PressableScale>
        ))}
        <View style={styles.vsBadge}><Text style={styles.vsText}>VS</Text></View>
      </View>

      {shared.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {shared.map(l => <Chip key={l} label={t(LANE_LABEL[l])} active={l === common} onPress={() => setLane(l)} game="wildrift" />)}
        </ScrollView>
      ) : null}
      {!common ? <Text style={styles.note}>{t("wr.differentLanes")}</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {RANKS.map(r => <Chip key={r} label={t(RANK_LABEL[r])} active={r === rank} onPress={() => setRank(r)} game="wildrift" icon={<RankEmblem tier={EMBLEM[r]} size={sizes.avatarXs} />} />)}
      </ScrollView>

      <Card style={styles.card}>
        <StatRow label={t("wr.winRate")} a={ea?.winRate} b={eb?.winRate} />
        <StatRow label={t("wr.pickRate")} a={ea?.pickRate} b={eb?.pickRate} />
        <StatRow label={t("wr.banRate")} a={ea?.banRate} b={eb?.banRate} />
        <StatRow label={t("wr.rankInLane")} a={ea?.strength} b={eb?.strength} format={v => (v == null ? "—" : `#${v}`)} lowerWins />
      </Card>

      <Text style={styles.section}>{t("wr.byRank")}</Text>
      <Card style={styles.card}>
        {RANKS.map(r => (
          <View key={r} style={styles.rankRow}>
            <Text style={[styles.rankValue, (a.byRank?.[r]?.[laneA]?.winRate ?? 0) > (b.byRank?.[r]?.[laneB]?.winRate ?? 0) && { color: ACCENT }]}>{pct(a.byRank?.[r]?.[laneA]?.winRate)}</Text>
            <View style={styles.rankMid}>
              <RankEmblem tier={EMBLEM[r]} size={sizes.item} />
              <Text style={styles.rankLabel}>{t(RANK_LABEL[r])}</Text>
            </View>
            <Text style={[styles.rankValue, styles.right, (b.byRank?.[r]?.[laneB]?.winRate ?? 0) > (a.byRank?.[r]?.[laneA]?.winRate ?? 0) && { color: SIDE_B }]}>{pct(b.byRank?.[r]?.[laneB]?.winRate)}</Text>
          </View>
        ))}
      </Card>

      <PressableScale onPress={() => navigation.replace("WRChampions", { pick: "compareB", a: idA, lane: common, rank })} haptic scaleTo={0.97} style={styles.change} accessibilityRole="button">
        <Icon name="compare" size={fontSizes.lg} color={ACCENT} />
        <Text style={styles.changeText}>{t("wr.changeRival")}</Text>
      </PressableScale>
      <Text style={styles.source}>{t("wr.champNote")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  pad:       { paddingHorizontal: spacing.lg },
  content:   { paddingTop: spacing.md, paddingBottom: spacing.hero },
  gap:       { marginTop: spacing.md },
  vs:        { flexDirection: "row", gap: spacing.sm },
  side:      { flex: 1, height: sizes.chart * 1.6, borderRadius: radii.xl, borderWidth: sizes.borderThick, overflow: "hidden", justifyContent: "flex-end", backgroundColor: colors.surfaceRaised },
  sideBody:  { padding: spacing.md, gap: spacing.xs, alignItems: "flex-start" },
  sideName:  { ...type.heading, color: colors.text, maxWidth: "100%" },
  sideLane:  { ...type.micro, color: colors.textSecondary },
  vsBadge:   { position: "absolute", top: "50%", left: "50%", marginTop: -sizes.avatarMd / 2, marginLeft: -sizes.avatarMd / 2, width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: sizes.avatarMd / 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderWidth: sizes.borderThick, borderColor: colors.border },
  vsText:    { ...type.captionStrong, color: colors.text },
  chips:     { paddingTop: spacing.sm },
  note:      { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
  card:      { marginTop: spacing.md, gap: spacing.md },
  stat:      { gap: spacing.xs },
  statTop:   { flexDirection: "row", alignItems: "center" },
  statValue: { ...type.bodyStrong, color: colors.text, width: sizes.iconHero - spacing.lg, fontVariant: ["tabular-nums"] },
  statLabel: { ...type.caption, color: colors.textSecondary, flex: 1, textAlign: "center" },
  right:     { textAlign: "right" },
  bar:       { flexDirection: "row", height: spacing.xs + spacing.xxs, borderRadius: radii.xs, overflow: "hidden", gap: spacing.xxs },
  barA:      { backgroundColor: ACCENT },
  barB:      { backgroundColor: SIDE_B },
  section:   { ...type.section, color: colors.text, marginTop: spacing.lg },
  rankRow:   { flexDirection: "row", alignItems: "center" },
  rankValue: { ...type.bodyStrong, color: colors.text, width: sizes.iconHero - spacing.lg, fontVariant: ["tabular-nums"] },
  rankMid:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  rankLabel: { ...type.caption, color: colors.textSecondary },
  change:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.lg, height: sizes.avatarLg + spacing.xs, borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.35), backgroundColor: withAlpha(ACCENT, 0.08) },
  changeText:{ ...type.captionStrong, color: colors.text },
  source:    { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
