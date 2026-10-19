import React, { useEffect, useLayoutEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Card, Chip, ErrorState, PressableScale, Skeleton, showHud } from "../../components/ui";
import Icon from "../../components/Icon";
import RankEmblem from "../../components/RankEmblem";
import { Shade, TierBadge } from "./components";
import { LANES, LANE_LABEL, RANKS, RANK_LABEL, champName, champSplash, getChampion, loadMains, toggleMain } from "./api";
import { useT } from "../../i18n/I18nProvider";
import { errorMessage } from "../../utils/format";
import { accents, colors, radii, sizes, spacing, type, fontSizes, withAlpha } from "../../theme";

const ACCENT = accents.wildrift;
const EMBLEM = { diamond: "DIAMOND", master: "MASTER", challenger: "CHALLENGER", legend: "CHALLENGER" };

/** Anillo de porcentaje (0–100) */
function Ring({ value, color, label }) {
  const size = sizes.avatarXl + spacing.sm;
  const stroke = spacing.sm;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <View style={styles.ringBox} accessible accessibilityLabel={`${label}: ${pct.toFixed(1)}%`}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={styles.ringSvg}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceHigh} strokeWidth={stroke} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
        </Svg>
        <View style={styles.ringCenter}><Text style={styles.ringValue}>{pct.toFixed(pct >= 10 ? 0 : 1)}%</Text></View>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

/**
 * Ficha de un campeón de Wild Rift: splash grande, tier, tres anillos (victorias, elección y baneo) y su winrate en
 * cada rango. Solo estadísticas del campeón: Wild Rift no publica builds ni partidas de jugadores.
 *  - params: { heroId, lane?, rank? }
 */
export default function ChampionScreen({ route, navigation }) {
  const t = useT();
  const { heroId } = route.params;
  const [state, setState] = useState({ status: "loading" });
  const [lane, setLane] = useState(route.params.lane || null);
  const rank = route.params.rank || "diamond";
  const [attempt, setAttempt] = useState(0);
  const [isMain, setIsMain] = useState(false);

  useEffect(() => { loadMains().then(list => setIsMain(list.includes(String(heroId)))); }, [heroId]);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    getChampion(heroId)
      .then(c => { if (alive) setState({ status: "ready", champ: c }); })
      .catch(e => { if (alive) setState({ status: "error", message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [heroId, attempt]);

  const champ = state.champ;
  // Estrella de "Mis mains" en la barra de arriba
  useLayoutEffect(() => {
    navigation.setOptions({
      ...(champ ? { title: champName(champ) } : null),
      headerRight: () => (
        <PressableScale
          haptic scaleTo={0.85} hitSlop={spacing.sm} style={styles.star}
          accessibilityRole="button" accessibilityState={{ selected: isMain }} accessibilityLabel={t(isMain ? "wr.removeMain" : "wr.addMain")}
          onPress={async () => {
            const list = await toggleMain(heroId);
            const on = list.includes(String(heroId));
            setIsMain(on);
            showHud(t(on ? "wr.mainAdded" : "wr.mainRemoved"));
          }}
        >
          <Icon name="star" filled={isMain} size={sizes.item} color={isMain ? colors.gold : colors.textMuted} />
        </PressableScale>
      ),
    });
  }, [champ, isMain]);

  if (state.status === "loading") {
    return <View style={styles.container}><Skeleton height={sizes.chart * 3} radius={0} /><View style={styles.pad}><Skeleton height={sizes.chart} radius={radii.lg} style={styles.gap} /><Skeleton height={sizes.chart} radius={radii.lg} style={styles.gap} /></View></View>;
  }
  if (state.status === "error") return <View style={styles.center}><ErrorState message={state.message} onRetry={() => setAttempt(n => n + 1)} /></View>;

  // Carriles en los que aparece (en el rango elegido) y el elegido o el primero
  const lanesHere = LANES.filter(l => champ.byRank?.[rank]?.[l]);
  const current = lane && lanesHere.includes(lane) ? lane : lanesHere[0];
  const e = champ.byRank?.[rank]?.[current];
  const perRank = RANKS.map(r => ({ rank: r, wr: champ.byRank?.[r]?.[current]?.winRate ?? null }));
  const values = perRank.map(p => p.wr).filter(v => v != null);
  const best = values.length ? Math.max(...values) : null;
  const min = values.length ? Math.min(...values) - 1 : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={{ uri: champSplash(champ) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <Shade from={0} to={1} />
        <View style={styles.heroBody}>
          <View style={styles.heroTags}>
            {e ? <TierBadge tier={e.tier} size="lg" /> : null}
            <Text style={styles.pill}>{current ? `${t(LANE_LABEL[current])} · ${t(RANK_LABEL[rank])}`.toUpperCase() : t("wr.noData")}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>{champName(champ)}</Text>
          {e ? <Text style={styles.heroSub}>{t("wr.position", { n: e.strength, of: e.of })}{e.trend ? ` · ${e.trend > 0 ? t("wr.trendUp") : t("wr.trendDown")}` : ""}</Text> : null}
        </View>
      </View>

      <View style={styles.pad}>
        {lanesHere.length > 1 ? (
          <View style={styles.chips}>{lanesHere.map(l => <Chip key={l} label={t(LANE_LABEL[l])} active={l === current} onPress={() => setLane(l)} game="wildrift" />)}</View>
        ) : null}

        {e ? (
          <Card style={styles.rings}>
            <Ring value={e.winRate} color={colors.win} label={t("wr.winRate")} />
            <Ring value={e.pickRate} color={ACCENT} label={t("wr.pickRate")} />
            <Ring value={e.banRate} color={colors.loss} label={t("wr.banRate")} />
          </Card>
        ) : <Text style={styles.note}>{t("wr.noData")}</Text>}

        <PressableScale onPress={() => navigation.navigate("WRChampions", { pick: "compareB", a: heroId, lane: current, rank })} haptic scaleTo={0.97} style={styles.compare} accessibilityRole="button">
          <Icon name="compare" size={fontSizes.lg} color={ACCENT} />
          <Text style={styles.compareText}>{t("wr.compareWith")}</Text>
        </PressableScale>

        {values.length ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>{t("wr.byRank")}</Text>
            </View>
            <Card style={styles.bars}>
              {perRank.map(p => {
                const h = p.wr == null ? 0 : ((p.wr - min) / Math.max(0.5, best - min)) * sizes.chart * 0.6 + spacing.lg;
                const top = p.wr != null && p.wr === best;
                return (
                  <View key={p.rank} style={styles.barCol}>
                    <Text style={[styles.barValue, top && styles.good]}>{p.wr == null ? "—" : p.wr.toFixed(1)}</Text>
                    <View style={[styles.bar, { height: h }, top ? styles.barTop : null]} />
                    <RankEmblem tier={EMBLEM[p.rank]} size={sizes.item} style={styles.barEmblem} />
                    <Text style={styles.barLabel} numberOfLines={1}>{t(RANK_LABEL[p.rank])}</Text>
                  </View>
                );
              })}
            </Card>
          </>
        ) : null}
        <Text style={styles.source}>{t("wr.champNote")}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { paddingBottom: spacing.hero },
  center:     { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  pad:        { paddingHorizontal: spacing.lg },
  gap:        { marginTop: spacing.md },
  hero:       { height: sizes.chart * 3.2, justifyContent: "flex-end", overflow: "hidden" },
  heroBody:   { padding: spacing.lg },
  heroTags:   { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pill:       { ...type.micro, color: ACCENT, letterSpacing: 0.8, borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.4), backgroundColor: withAlpha(colors.bg, 0.7), borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, overflow: "hidden" },
  name:       { ...type.largeTitle, fontSize: fontSizes.hero + spacing.sm, color: colors.text, marginTop: spacing.sm },
  heroSub:    { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  chips:      { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  rings:      { flexDirection: "row", justifyContent: "space-around", paddingVertical: spacing.lg, marginTop: spacing.md },
  ringBox:    { alignItems: "center" },
  ringSvg:    { transform: [{ rotate: "-90deg" }] },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  ringValue:  { ...type.heading, color: colors.text, fontVariant: ["tabular-nums"] },
  ringLabel:  { ...type.caption, color: colors.textSecondary, marginTop: spacing.sm },
  sectionRow: { marginTop: spacing.lg, marginBottom: spacing.sm },
  section:    { ...type.section, color: colors.text },
  bars:       { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md, paddingTop: spacing.lg },
  barCol:     { flex: 1, alignItems: "center" },
  barValue:   { ...type.captionStrong, color: colors.text, marginBottom: spacing.xs, fontVariant: ["tabular-nums"] },
  bar:        { width: "100%", borderTopLeftRadius: radii.md, borderTopRightRadius: radii.md, borderBottomLeftRadius: radii.xs, borderBottomRightRadius: radii.xs, backgroundColor: withAlpha(ACCENT, 0.75) },
  barTop:     { backgroundColor: colors.win },
  barEmblem:  { marginTop: spacing.sm },
  barLabel:   { ...type.micro, color: colors.textMuted, marginTop: spacing.xxs },
  good:       { color: colors.win },
  star:       { padding: spacing.xs, marginRight: spacing.sm },
  compare:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm, height: sizes.avatarLg + spacing.xs, borderRadius: radii.lg, borderWidth: sizes.hairline, borderColor: withAlpha(ACCENT, 0.35), backgroundColor: withAlpha(ACCENT, 0.08) },
  compareText:{ ...type.captionStrong, color: colors.text },
  note:       { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
  source:     { ...type.micro, color: colors.textMuted, marginTop: spacing.lg },
});
