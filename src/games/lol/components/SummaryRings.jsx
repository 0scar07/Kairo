import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useT } from "../../../i18n/I18nProvider";
import { CountUp } from "../../../components/ui";
import { championLabel } from "../../../api/ddragon";
import { formatDuration, formatNumber } from "../../../utils/format";
import { colors, sizes, spacing, fontSizes, type, winrateColor, useAccent } from "../../../theme";

const SIZE = 128;
const STROKE = 9;
const R = (SIZE - STROKE) / 2 - 1;
const C = 2 * Math.PI * R;
const GAP = 4;   // separación entre tramos del anillo de KDA

/**
 * Resumen de las últimas partidas: anillo de winrate, anillo de KDA repartido en asesinatos / asistencias /
 * muertes, y una fila con CS por minuto, daño por minuto y duración media.
 */
export default function SummaryRings({ overall, pace, topChamp }) {
  const t = useT();
  const accent = useAccent("lol");
  const wrColor = winrateColor(overall.wr, accent);

  const k = parseFloat(overall.avgKills), d = parseFloat(overall.avgDeaths), a = parseFloat(overall.avgAssists);
  const total = k + d + a;
  const kdaSegments = total > 0 ? [
    { value: k, color: colors.win },
    { value: a, color: accent },
    { value: d, color: colors.loss },
  ] : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">{t("stats.lastGames", { count: overall.games })}</Text>
      {topChamp ? (
        <Text style={styles.sub}>{t("stats.mostPlayedLine", { champ: championLabel(topChamp.name), games: t("common.games", { count: topChamp.games }) })}</Text>
      ) : null}

      <View style={styles.rings}>
        <View style={styles.ring} accessible accessibilityLabel={`${t("stats.winrate")} ${overall.wr}%, ${overall.wins}V ${overall.losses}D`}>
          <Ring segments={[{ value: overall.wr, color: wrColor }, { value: 100 - overall.wr, color: null }]} round />
          <View style={styles.center} pointerEvents="none">
            <CountUp value={overall.wr} format={v => `${v}%`} style={styles.big} />
            <Text style={styles.small}>{overall.wins}V {overall.losses}D</Text>
          </View>
          <Text style={styles.caption}>{t("stats.winrate")}</Text>
        </View>
        <View style={styles.ring} accessible accessibilityLabel={`${t("stats.avgKda")} ${overall.kda}, ${overall.avgKills} / ${overall.avgDeaths} / ${overall.avgAssists}`}>
          <Ring segments={kdaSegments} gap={kdaSegments.length > 1} />
          <View style={styles.center} pointerEvents="none">
            <Text style={styles.big}>{overall.kda}</Text>
            <Text style={styles.small}>{overall.avgKills} / {overall.avgDeaths} / {overall.avgAssists}</Text>
          </View>
          <Text style={styles.caption}>{t("stats.avgKda")}</Text>
        </View>
      </View>

      {pace ? (
        <>
          <Group cells={[
            { value: formatNumber(pace.kills), label: t("stats.totalKills") },
            { value: formatNumber(pace.deaths), label: t("stats.totalDeaths") },
            { value: formatNumber(pace.assists), label: t("stats.totalAssists") },
          ]} />
          <Group cells={[
            { value: pace.killParticipation != null ? `${pace.killParticipation}%` : "–", label: t("stats.killParticipation") },
            { value: formatNumber(pace.dmgPerMin), label: t("stats.dmgMin") },
            { value: formatNumber(pace.goldPerMin), label: t("stats.goldMin") },
          ]} />
          <Group cells={[
            { value: pace.csPerMin, label: t("stats.csMin") },
            { value: pace.visionPerMin, label: t("stats.visionMin") },
            { value: formatDuration(pace.avgDuration), label: t("stats.avgDuration") },
          ]} />
        </>
      ) : null}
    </View>
  );
}

// Anillo de tramos: segments [{ value, color }] proporcionales; color null deja ver la pista
export function Ring({ segments, gap = false, round = false }) {
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  const usable = gap ? C - GAP * segments.length : C;
  let offset = 0;
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surfaceHigh} strokeWidth={STROKE} fill="none" />
      {segments.map((s, i) => {
        const len = (s.value / sum) * usable;
        const el = s.color && len > 0 ? (
          <Circle
            key={i}
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
            stroke={s.color} strokeWidth={STROKE} strokeLinecap={round ? "round" : "butt"}
            strokeDasharray={`${len} ${C}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        ) : null;
        offset += len + (gap ? GAP : 0);
        return el;
      })}
    </Svg>
  );
}

// Fila de tres cifras separadas por líneas (como los bloques de la referencia)
export function Group({ cells }) {
  return (
    <View style={styles.group}>
      {cells.map((c, i) => (
        <React.Fragment key={c.label}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <Cell value={c.value} label={c.label} />
        </React.Fragment>
      ))}
    </View>
  );
}

function Cell({ value, label }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.cellLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export const RING_SIZE = SIZE;

const styles = StyleSheet.create({
  wrap:      { marginBottom: spacing.lg },
  title:     { ...type.title, color: colors.text },
  sub:       { ...type.small, color: colors.textMuted, marginTop: spacing.xxs },
  rings:     { flexDirection: "row", justifyContent: "space-around", marginTop: spacing.lg, marginBottom: spacing.lg },
  ring:      { alignItems: "center" },
  center:    { position: "absolute", top: 0, width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  big:       { ...type.statLarge, fontSize: fontSizes.xxl + spacing.xxs, color: colors.text },
  small:     { ...type.caption, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  caption:   { ...type.small, color: colors.textMuted, marginTop: spacing.sm },
  group:     {
    flexDirection: "row", backgroundColor: colors.surface,
    borderWidth: sizes.hairline, borderColor: colors.border, borderRadius: spacing.md + spacing.xxs, marginBottom: spacing.sm + spacing.xxs,
  },
  cell:      { flex: 1, alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.xs, gap: spacing.xxs },
  cellValue: { ...type.stat, color: colors.text },
  cellLabel: { ...type.caption, color: colors.textMuted },
  divider:   { width: sizes.hairline, backgroundColor: colors.border },
});
