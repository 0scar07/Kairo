import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Line, Circle, Text as SvgText } from "react-native-svg";
import { Card, Chip, SectionLabel } from "../../../components/ui";
import { useT } from "../../../i18n/I18nProvider";
import { activeLanguage } from "../../../i18n";
import { tierLabel } from "../../../utils/format";
import { getRankHistory, seriesFor, changeSince, scaleFor, tierAt } from "../history";
import { colors, fonts, radii, sizes, spacing, type, useAccent, withAlpha } from "../../../theme";

const H = 168;
const PAD = { l: 8, r: 64, t: 12, b: 24 };   // el margen derecho lleva los nombres de los niveles

const fmtDay = day => new Date(`${day}T12:00:00Z`).toLocaleDateString(activeLanguage(), { day: "numeric", month: "short", timeZone: "UTC" });
const signed = n => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;

// Gráfico de puntos de liga a lo largo del tiempo (línea con área, ejes por división y nombre del nivel al lado)
function Chart({ series, color, width }) {
  const scale = scaleFor(series);
  const w = Math.max(width, 120);
  const plotW = w - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
  const t0 = series[0].ms, t1 = series[series.length - 1].ms;
  const x = ms => PAD.l + (t1 === t0 ? plotW / 2 : ((ms - t0) / (t1 - t0)) * plotW);
  const y = score => PAD.t + (1 - (score - scale.min) / (scale.max - scale.min)) * plotH;

  const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.ms).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
  const area = `${line} L${x(t1).toFixed(1)} ${(PAD.t + plotH).toFixed(1)} L${x(t0).toFixed(1)} ${(PAD.t + plotH).toFixed(1)} Z`;
  const grid = [];
  for (let s = scale.min; s <= scale.max; s += 100) grid.push(s);
  const last = series[series.length - 1];

  return (
    <Svg width={w} height={H}>
      <Defs>
        <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.32" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {grid.map(s => (
        <React.Fragment key={s}>
          <Line x1={PAD.l} x2={PAD.l + plotW} y1={y(s)} y2={y(s)} stroke={withAlpha(colors.text, s % 400 === 0 ? 0.16 : 0.06)} strokeWidth={1} />
          {s % 400 === 0 && s < 2800 ? <SvgText x={PAD.l + plotW + 6} y={y(s) + 3} fontSize={9} fontFamily={fonts.bodyBold} fill={colors.textMuted}>{tierAt(s)}</SvgText> : null}
        </React.Fragment>
      ))}
      {series.length > 1 ? <Path d={area} fill="url(#fill)" /> : null}
      {series.length > 1 ? <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {series.map((p, i) => (i === series.length - 1 ? null : <Circle key={p.day} cx={x(p.ms)} cy={y(p.score)} r={2.5} fill={color} />))}
      <Circle cx={x(last.ms)} cy={y(last.score)} r={9} fill={withAlpha(color, 0.25)} />
      <Circle cx={x(last.ms)} cy={y(last.score)} r={4.5} fill={color} stroke={colors.bg} strokeWidth={2} />
      <SvgText x={PAD.l} y={H - 6} fontSize={10} fontFamily={fonts.body} fill={colors.textMuted}>{fmtDay(series[0].day)}</SvgText>
      {series.length > 1 ? <SvgText x={PAD.l + plotW} y={H - 6} fontSize={10} fontFamily={fonts.body} fill={colors.textMuted} textAnchor="end">{fmtDay(last.day)}</SvgText> : null}
    </Svg>
  );
}

function Delta({ label, value, color }) {
  return (
    <View style={[styles.delta, { borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.1) }]}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <Text style={[styles.deltaValue, { color }]}>{signed(value)} LP</Text>
    </View>
  );
}

/**
 * Historial de rango: cuántos puntos de liga ha ganado o perdido el jugador desde que Kairo empezó a guardarlo.
 * No existe historial anterior (Riot no lo entrega): la primera foto es la de hoy y el gráfico se va llenando cada día.
 */
export default function RankHistoryCard({ puuid, region }) {
  const t = useT();
  const accent = useAccent("lol");
  const [snapshots, setSnapshots] = useState(null);   // null = cargando; [] = sin datos o error
  const [queue, setQueue] = useState("solo");
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getRankHistory(puuid, region)
      .then(s => { if (!cancelled) setSnapshots(s); })
      .catch(e => { console.warn("Historial de rango no disponible:", e.message); if (!cancelled) setSnapshots([]); });
    return () => { cancelled = true; };
  }, [puuid, region]);

  if (snapshots === null || snapshots.length === 0) return null;   // cargando o sin servicio: no estorba

  const series = seriesFor(snapshots, queue);
  const other = queue === "solo" ? "flex" : "solo";
  const hasOther = seriesFor(snapshots, other).length > 0;
  const last = series[series.length - 1];
  const color = (last && colors.tier[last.entry.tier]) || accent;
  const d7 = changeSince(series, 7), d30 = changeSince(series, 30);
  const first = series[0];
  const total = last && first && series.length > 1 ? last.score - first.score : null;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <SectionLabel style={styles.label}>{t("history.title")}</SectionLabel>
        {hasOther || queue === "flex" ? (
          <View style={styles.queues}>
            <Chip label={t("ranked.solo")} active={queue === "solo"} onPress={() => setQueue("solo")} game="lol" />
            <Chip label={t("ranked.flex")} active={queue === "flex"} onPress={() => setQueue("flex")} game="lol" />
          </View>
        ) : null}
      </View>

      {!last ? (
        <Text style={styles.empty}>{t("history.unranked")}</Text>
      ) : (
        <>
          <Text style={[styles.now, { color }]}>{tierLabel(last.entry.tier, last.entry.rank)} · {last.entry.lp} LP</Text>
          {series.length > 1 ? (
            <View style={styles.deltas}>
              {d7 != null ? <Delta label={t("history.change7")} value={d7} color={d7 >= 0 ? colors.win : colors.loss} /> : null}
              {d30 != null ? <Delta label={t("history.change30")} value={d30} color={d30 >= 0 ? colors.win : colors.loss} /> : null}
              {d7 == null && d30 == null && total != null ? <Delta label={t("history.sinceStart")} value={total} color={total >= 0 ? colors.win : colors.loss} /> : null}
            </View>
          ) : null}

          <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={styles.chart}>
            {width > 0 ? <Chart series={series} color={color} width={width} /> : null}
          </View>

          <Text style={styles.foot}>
            {series.length > 1 ? t("history.since", { date: fmtDay(first.day) }) : t("history.gathering")}
          </Text>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card:       { marginBottom: spacing.lg },
  head:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  label:      { marginBottom: 0 },
  queues:     { flexDirection: "row" },
  now:        { ...type.stat, marginTop: spacing.md },
  deltas:     { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" },
  delta:      { flexDirection: "row", alignItems: "center", gap: spacing.xs, borderWidth: sizes.hairline, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  deltaLabel: { ...type.caption, color: colors.textMuted },
  deltaValue: { ...type.captionStrong },
  chart:      { marginTop: spacing.md, minHeight: H },
  foot:       { ...type.caption, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 16 },
  empty:      { ...type.small, color: colors.textMuted, marginTop: spacing.md },
});
