import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Card, Chip, EmptyState, SegmentedTabs, Skeleton } from "../../components/ui";
import { Chart, fmtDay, signed } from "./components/RankHistoryCard";
import { getRankHistory, seriesFor } from "./history";
import { tierLabel } from "../../utils/format";
import { useT } from "../../i18n/I18nProvider";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../../theme";

const DAY_MS = 86_400_000;
const CHART_H = 168;   // la altura del gráfico de RankHistoryCard
const PERIODS = [{ key: "7", days: 7 }, { key: "30", days: 30 }, { key: "season", days: null }];

/**
 * Progreso de LP de una cola, a pantalla completa. Se abre al tocar la columna Solo/Dúo o Flex del perfil (la tarjeta
 * de historial del perfil sigue igual). Arriba se cambia de cola y de periodo; debajo, el pico, el mejor día y el
 * récord del periodo. Riot no da historial: son las fotos diarias que guarda el servidor (ver history.js).
 *  - params: { puuid, region, queue: "solo" | "flex", name }
 */
export default function RankHistoryScreen({ route }) {
  const t = useT();
  const accent = useAccent("lol");
  const { puuid, region, name } = route.params;
  const [queue, setQueue] = useState(route.params.queue === "flex" ? "flex" : "solo");
  const [period, setPeriod] = useState("30");
  const [snapshots, setSnapshots] = useState(null);   // null = cargando; [] = sin datos o error
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let alive = true;
    getRankHistory(puuid, region)
      .then(s => { if (alive) setSnapshots(s || []); })
      .catch(() => { if (alive) setSnapshots([]); });
    return () => { alive = false; };
  }, [puuid, region]);

  const all = seriesFor(snapshots || [], queue);
  const days = PERIODS.find(p => p.key === period).days;
  const lastMs = all.length ? all[all.length - 1].ms : 0;
  const series = days ? all.filter(p => p.ms >= lastMs - days * DAY_MS) : all;
  const first = series[0], last = series[series.length - 1];
  const color = (last && colors.tier[last.entry.tier]) || accent;
  const change = series.length > 1 ? last.score - first.score : null;

  // Pico del periodo, mejor día (la mayor subida entre dos fotos seguidas) y récord jugado en el periodo
  const peak = series.reduce((best, p) => (!best || p.score > best.score ? p : best), null);
  let bestDay = null;
  for (let i = 1; i < series.length; i++) {
    const gain = series[i].score - series[i - 1].score;
    if (gain > 0 && (!bestDay || gain > bestDay.gain)) bestDay = { gain, day: series[i].day };
  }
  const wins = series.length > 1 ? Math.max(0, (last.entry.wins ?? 0) - (first.entry.wins ?? 0)) : null;
  const losses = series.length > 1 ? Math.max(0, (last.entry.losses ?? 0) - (first.entry.losses ?? 0)) : null;

  const queueTabs = [{ key: "solo", label: t("ranked.solo") }, { key: "flex", label: t("ranked.flex") }];
  const periodLabel = { "7": t("history.change7"), "30": t("history.change30"), season: t("lpHistory.season") };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {name ? <Text style={styles.name} numberOfLines={1}>{name}</Text> : null}
      <SegmentedTabs tabs={queueTabs} value={queue} onChange={setQueue} game="lol" />

      <View style={styles.periods} accessibilityRole="tablist">
        {PERIODS.map(p => <Chip key={p.key} label={periodLabel[p.key]} active={period === p.key} onPress={() => setPeriod(p.key)} game="lol" />)}
      </View>

      {snapshots === null ? (
        <Skeleton height={sizes.iconHero * 3} radius={radii.lg} />
      ) : !last ? (
        <EmptyState compact icon="trending" title={t("history.unranked")} text={t("history.gathering")} />
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={[styles.now, { color }]}>{tierLabel(last.entry.tier, last.entry.rank)} · {last.entry.lp} LP</Text>
            {change != null ? (
              <Text style={[styles.change, { color: change >= 0 ? colors.win : colors.loss }]}>
                {t("lpHistory.change", { value: signed(change), period: periodLabel[period].toLowerCase() })}
              </Text>
            ) : null}
            <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={styles.chart}>
              {width > 0 ? <Chart series={series} color={color} width={width} /> : null}
            </View>
            <Text style={styles.foot}>{series.length > 1 ? t("history.since", { date: fmtDay(all[0].day) }) : t("history.gathering")}</Text>
          </Card>

          {series.length > 1 ? (
            <View style={styles.kpis}>
              <Kpi value={peak ? `${peak.entry.lp} LP` : "—"} sub={peak ? tierLabel(peak.entry.tier, peak.entry.rank) : ""} label={t("lpHistory.peak")} color={colors.win} />
              <Kpi value={bestDay ? `${signed(bestDay.gain)} LP` : "—"} sub={bestDay ? fmtDay(bestDay.day) : ""} label={t("lpHistory.bestDay")} />
              <Kpi value={wins != null ? `${wins}V · ${losses}D` : "—"} sub={wins != null && wins + losses > 0 ? `${Math.round((wins / (wins + losses)) * 100)}%` : ""} label={t("lpHistory.record")} />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Kpi({ value, sub, label, color }) {
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${label}: ${value} ${sub}`}>
      <Text style={[styles.kpiValue, color && { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={styles.kpiSub} numberOfLines={1}>{sub}</Text> : null}
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.lg, paddingBottom: spacing.hero },
  name:      { ...type.small, color: colors.textMuted, marginBottom: spacing.sm },
  periods:   { flexDirection: "row", marginTop: spacing.lg, marginBottom: spacing.lg },
  card:      { marginBottom: spacing.md },
  now:       { ...type.stat },
  change:    { ...type.bodyStrong, marginTop: spacing.xs },
  chart:     { marginTop: spacing.md, minHeight: CHART_H },
  foot:      { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
  kpis:      { flexDirection: "row", gap: spacing.sm },
  kpi:       {
    flex: 1, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface,
    borderWidth: sizes.hairline, borderColor: withAlpha(colors.text, 0.06),
  },
  kpiValue:  { ...type.heading, color: colors.text, fontVariant: ["tabular-nums"] },
  kpiSub:    { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  kpiLabel:  { ...type.micro, color: colors.textMuted, marginTop: spacing.xs },
});
