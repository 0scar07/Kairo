import React, { useEffect, useLayoutEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { Card, Chip, ErrorState, PressableScale, Skeleton } from "../../components/ui";
import RankEmblem from "../../components/RankEmblem";
import { Shade, TierBadge } from "./components";
import LaneIcon from "./LaneIcon";
import TierShareButton from "./TierShare";
import { LANES, LANE_LABEL, RANKS, RANK_LABEL, champIcon, champName, champSplash, getMeta } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage } from "../../utils/format";
import { select } from "../../utils/haptics";
import { accents, colors, radii, sizes, spacing, type, withAlpha } from "../../theme";

const ACCENT = accents.wildrift;
const TIER_ORDER = ["S+", "S", "A", "B", "C", "D"];
const EMBLEM = { diamond: "DIAMOND", master: "MASTER", challenger: "CHALLENGER", legend: "CHALLENGER" };
// Formas de ordenar: por tier (la vista de "tier maker") o una lista por victorias, elección o baneo
const SORTS = [
  { id: "tier", label: "wr.sortTier" },
  { id: "winRate", label: "wr.winRate" },
  { id: "pickRate", label: "wr.pickRate" },
  { id: "banRate", label: "wr.banRate" },
];

/**
 * Tier list de Wild Rift al estilo "tier maker": una fila por tier con los retratos de sus campeones y su winrate.
 * Se filtra por carril (íconos) y rango (emblemas). Al tocar un retrato aparece su resumen abajo.
 *  - params: { lane?, rank? }
 */
export default function TierListScreen({ route, navigation }) {
  const t = useT();
  const [lane, setLane] = useState(route.params?.lane || "dragon");
  const [rank, setRank] = useState(route.params?.rank || "diamond");
  const [state, setState] = useState({ status: "loading" });
  const [picked, setPicked] = useState(null);
  const [sort, setSort] = useState("tier");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState(s => (s.status === "ready" ? s : { status: "loading" }));
    getMeta(rank)
      .then(meta => { if (alive) setState({ status: "ready", meta }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [rank, attempt]);

  useEffect(() => { setPicked(null); }, [lane, rank]);

  const list = state.meta?.lanes?.[lane] || [];
  const tiers = TIER_ORDER.map(tier => ({ tier, champs: list.filter(c => c.tier === tier) })).filter(r => r.champs.length);
  const hero = picked || list[0];
  const open = c => navigation.navigate("WRChampion", { heroId: c.heroId, lane, rank });
  const ranked = sort === "tier" ? [] : [...list].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));
  const top = ranked[0]?.[sort] || 1;

  // Compartir la tier list del carril y rango elegidos como imagen
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TierShareButton
          list={list}
          title={t("wr.whoRulesShare", { lane: t(LANE_LABEL[lane]) })}
          subtitle={`WILD RIFT · ${t(RANK_LABEL[rank]).toUpperCase()}`}
          footer={t("wr.shareFooter", { date: state.meta?.date || "—" })}
        />
      ),
    });
  }, [state.meta, lane, rank]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        {hero ? <Image source={{ uri: champSplash(hero) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <Shade from={0.3} to={1} />
        <View style={styles.topBody}>
          <Text style={styles.pill}>{t("wr.tierListPill")}</Text>
          <Text style={styles.headline}>{t("wr.whoRules")} <Text style={{ color: ACCENT }}>{t(LANE_LABEL[lane])}</Text>?</Text>
        </View>
      </View>

      <View style={styles.pad}>
        <Card style={styles.lanes} padded={false}>
          {LANES.map(l => {
            const on = l === lane;
            return (
              <PressableScale key={l} onPress={() => { if (!on) { select(); setLane(l); } }} style={[styles.lane, on && styles.laneOn]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t(LANE_LABEL[l])}>
                <LaneIcon lane={l} size={sizes.item - spacing.xs} color={on ? colors.text : colors.textSecondary} />
                <Text style={[styles.laneText, on && styles.laneTextOn]} numberOfLines={1}>{t(LANE_LABEL[l])}</Text>
              </PressableScale>
            );
          })}
        </Card>

        <View style={styles.ranks}>
          {RANKS.map(r => {
            const on = r === rank;
            return (
              <PressableScale key={r} onPress={() => { if (!on) { select(); setRank(r); } }} style={[styles.rank, on && styles.rankOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <RankEmblem tier={EMBLEM[r]} size={sizes.item - spacing.xs} />
                <Text style={[styles.rankText, on && styles.rankTextOn]} numberOfLines={1}>{t(RANK_LABEL[r])}</Text>
              </PressableScale>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sorts}>
          {SORTS.map(o => <Chip key={o.id} label={t(o.label)} active={sort === o.id} onPress={() => setSort(o.id)} game="wildrift" />)}
        </ScrollView>

        {state.status === "loading" ? (
          [0, 1, 2, 3].map(i => <Skeleton key={i} height={sizes.chart * 0.7} radius={radii.lg} style={styles.gap} />)
        ) : state.status === "error" ? (
          <ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} />
        ) : (
          <>
            {sort !== "tier" ? (
              <Card padded={false}>
                {ranked.map((c, i) => (
                  <PressableScale key={c.heroId} onPress={() => open(c)} scaleTo={0.98} style={[styles.rankedRow, i && styles.rankedSep]} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${champName(c)}, ${c[sort]?.toFixed(1)}%`}>
                    <Text style={styles.rankedPos}>{i + 1}</Text>
                    <Image source={{ uri: champIcon(c) }} style={styles.rankedImg} />
                    <View style={styles.rankedBody}>
                      <View style={styles.rankedTop}>
                        <Text style={styles.rankedName} numberOfLines={1}>{champName(c)}</Text>
                        <TierBadge tier={c.tier} size="sm" />
                      </View>
                      <View style={styles.rankedTrack}><View style={[styles.rankedFill, { width: `${Math.max(4, ((c[sort] ?? 0) / top) * 100)}%` }]} /></View>
                    </View>
                    <Text style={styles.rankedValue}>{c[sort]?.toFixed(1)}%</Text>
                  </PressableScale>
                ))}
              </Card>
            ) : null}
            {sort === "tier" && tiers.map(row => (
              <View key={row.tier} style={styles.tierRow}>
                <View style={[styles.tierCol, { backgroundColor: colors.wrTier[row.tier] }]}><Text style={styles.tierColText}>{row.tier}</Text></View>
                <View style={styles.ports}>
                  {row.champs.map(c => {
                    const sel = picked?.heroId === c.heroId;
                    return (
                      <PressableScale key={c.heroId} onPress={() => { select(); setPicked(sel ? null : c); }} onLongPress={() => open(c)} scaleTo={0.92} style={styles.port} accessibilityRole="button" accessibilityLabel={`${champName(c)}, ${c.winRate?.toFixed(1)}%`}>
                        <Image source={{ uri: champIcon(c) }} style={[styles.portImg, sel && styles.portSel]} />
                        {c.trend ? <View style={[styles.trend, { backgroundColor: c.trend > 0 ? colors.win : colors.loss }]}><Text style={styles.trendText}>{c.trend > 0 ? "▲" : "▼"}</Text></View> : null}
                        <Text style={[styles.portWr, c.winRate >= 50 ? styles.good : styles.meh]}>{c.winRate?.toFixed(1)}%</Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            ))}
            {sort !== "tier" ? null : picked ? (
              <PressableScale onPress={() => open(picked)} style={styles.tip} accessibilityRole="button">
                <Image source={{ uri: champIcon(picked) }} style={styles.tipImg} />
                <View style={styles.tipBody}>
                  <Text style={styles.tipName}>{t("wr.tipTitle", { name: champName(picked), wr: picked.winRate?.toFixed(1) })}</Text>
                  <Text style={styles.tipSub}>{t("wr.tipSub", { pick: picked.pickRate?.toFixed(1), ban: picked.banRate?.toFixed(1) })}</Text>
                </View>
                <Text style={styles.tipGo}>{t("wr.view")} ›</Text>
              </PressableScale>
            ) : (
              <Text style={styles.hint}>{t("wr.tapHint")}</Text>
            )}
            <Text style={styles.source}>{t("wr.sourceFull", { date: state.meta?.date || "—" })}</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { paddingBottom: spacing.hero },
  top:        { height: sizes.chart * 1.5, justifyContent: "flex-end", overflow: "hidden" },
  topBody:    { padding: spacing.lg },
  pill:       { ...type.micro, alignSelf: "flex-start", color: ACCENT, letterSpacing: 0.8, borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.4), backgroundColor: withAlpha(colors.bg, 0.7), borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, overflow: "hidden" },
  headline:   { ...type.title, color: colors.text, marginTop: spacing.sm },
  pad:        { paddingHorizontal: spacing.lg },
  gap:        { marginTop: spacing.sm },
  lanes:      { flexDirection: "row", padding: spacing.xs, gap: spacing.xs },
  lane:       { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xxs, paddingVertical: spacing.sm, borderRadius: radii.md },
  laneOn:     { backgroundColor: withAlpha(ACCENT, 0.22), borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.55) },
  laneText:   { ...type.micro, color: colors.textSecondary },
  laneTextOn: { color: colors.text },
  sorts:      { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  rankedRow:  { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rankedSep:  { borderTopWidth: sizes.hairline, borderTopColor: colors.border },
  rankedPos:  { ...type.captionStrong, color: colors.textMuted, width: spacing.lg, textAlign: "center", fontVariant: ["tabular-nums"] },
  rankedImg:  { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: radii.md },
  rankedBody: { flex: 1, gap: spacing.xs },
  rankedTop:  { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rankedName: { ...type.bodyStrong, color: colors.text, flexShrink: 1 },
  rankedTrack:{ height: spacing.xs, borderRadius: radii.xs, backgroundColor: colors.surfaceHigh, overflow: "hidden" },
  rankedFill: { height: "100%", borderRadius: radii.xs, backgroundColor: ACCENT },
  rankedValue:{ ...type.bodyStrong, color: colors.text, fontVariant: ["tabular-nums"] },
  ranks:      { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  rank:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xxs, height: sizes.avatarMd, borderRadius: radii.md, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  rankOn:     { borderColor: withAlpha(ACCENT, 0.6), backgroundColor: withAlpha(ACCENT, 0.14) },
  rankText:   { ...type.micro, color: colors.textSecondary, flexShrink: 1 },
  rankTextOn: { color: colors.text },
  tierRow:    { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  tierCol:    { width: sizes.avatarLg + spacing.xs, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" },
  tierColText:{ ...type.heading, color: colors.onAccent },
  ports:      { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.sm, borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  port:       { width: sizes.avatarLg + spacing.sm, alignItems: "center" },
  portImg:    { width: sizes.avatarLg + spacing.sm, height: sizes.avatarLg + spacing.sm, borderRadius: radii.md },
  portSel:    { borderWidth: sizes.borderThick, borderColor: ACCENT },
  trend:      { position: "absolute", top: -spacing.xs, right: -spacing.xs, width: spacing.lg, height: spacing.lg, borderRadius: spacing.sm, alignItems: "center", justifyContent: "center", borderWidth: sizes.borderThick, borderColor: colors.bg },
  trendText:  { ...type.micro, fontSize: spacing.sm, color: colors.onAccent },
  portWr:     { ...type.micro, marginTop: spacing.xxs, fontVariant: ["tabular-nums"] },
  good:       { color: colors.win },
  meh:        { color: colors.textSecondary },
  tip:        { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.4), backgroundColor: colors.surface },
  tipImg:     { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.md },
  tipBody:    { flex: 1 },
  tipName:    { ...type.bodyStrong, color: colors.text },
  tipSub:     { ...type.caption, color: colors.textSecondary },
  tipGo:      { ...type.captionStrong, color: ACCENT },
  hint:       { ...type.caption, color: colors.textMuted, marginTop: spacing.md, textAlign: "center" },
  source:     { ...type.micro, color: colors.textMuted, marginTop: spacing.md },
});
