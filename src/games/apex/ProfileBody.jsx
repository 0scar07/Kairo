import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Reveal from "../../components/Reveal";
import { Card, SectionLabel, StatGrid, ProgressBar, Notice } from "../../components/ui";
import { rankLabel, TOTALS } from "./utils";
import { formatCompact, formatNumber } from "../../utils/format";
import { useT } from "../../i18n/I18nProvider";
import { colors, sizes, spacing, type, useAccent } from "../../theme";

const GAME = "apex";

// Contenido del perfil de Apex Legends (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function ApexProfileBody({ data }) {
  const t = useT();
  const accent = useAccent(GAME);
  const { player } = data;
  const { global: g, realtime, legend, totals } = player;

  const totalItems = TOTALS.filter(([key]) => totals?.[key]).map(([key, label]) => ({
    label: t(label),
    value: key === "kd" ? totals[key].value.toFixed(1) : formatCompact(totals[key].value),
  }));
  const legendStats = (legend?.stats || []).filter(s => typeof s.value === "number").slice(0, 3);

  return (
    <>
      {g.banned && <Reveal order={1}><Notice tone="error" icon="alert">{t("apex.banned")}</Notice></Reveal>}

      <Reveal order={1}>
        <Card>
          <View style={styles.rank}>
            {g.rank?.image ? <Image source={{ uri: g.rank.image }} style={styles.rankImg} resizeMode="contain" /> : null}
            <View style={styles.rankInfo}>
              <SectionLabel style={styles.rankLabel}>{t("apex.rank")}</SectionLabel>
              <Text style={[styles.rankText, { color: accent }]}>{rankLabel(g.rank)}</Text>
              <Text style={styles.rankSub}>
                {g.rank ? t("apex.points", { n: formatNumber(g.rank.score) }) : ""}
                {g.rank?.ladderPos > 0 ? ` · #${formatNumber(g.rank.ladderPos)}` : ""}
              </Text>
            </View>
          </View>
        </Card>
      </Reveal>

      <Reveal order={2}>
        <Card>
          <View style={styles.levelRow}>
            <SectionLabel style={styles.levelLabel}>{t("apex.level", { level: g.level })}</SectionLabel>
            {realtime ? (
              <View style={styles.status}>
                <View style={[styles.dot, { backgroundColor: realtime.online ? colors.win : colors.textFaint }]} />
                <Text style={styles.statusText}>
                  {realtime.inGame ? t("apex.inGame") : realtime.online ? t("apex.online") : t("apex.offline")}
                </Text>
              </View>
            ) : null}
          </View>
          {g.toNextLevelPercent != null ? <ProgressBar value={g.toNextLevelPercent} color={accent} glowing /> : null}
        </Card>
      </Reveal>

      {legend && (
        <Reveal order={3}>
          <Card padded={false} style={styles.legendCard}>
            {legend.banner ? <Image source={{ uri: legend.banner }} style={styles.banner} resizeMode="cover" /> : null}
            <View style={styles.legendBody}>
              <SectionLabel icon="target">{t("apex.legend", { name: legend.name })}</SectionLabel>
              <View style={styles.legendStats}>
                {legendStats.map(s => (
                  <View key={s.key} style={styles.legendStat}>
                    <Text style={styles.legendValue}>{formatCompact(s.value)}</Text>
                    <Text style={styles.legendName} numberOfLines={1}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        </Reveal>
      )}

      {totalItems.length > 0 && <Reveal order={4}><StatGrid label={t("apex.totals")} icon="barChart" items={totalItems} /></Reveal>}
    </>
  );
}

const styles = StyleSheet.create({
  rank:        { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  rankImg:     { width: sizes.iconHero - spacing.sm, height: sizes.iconHero - spacing.sm },
  rankInfo:    { flex: 1 },
  rankLabel:   { marginBottom: spacing.xs },
  rankText:    { ...type.statLarge },
  rankSub:     { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  levelRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  levelLabel:  { marginBottom: 0 },
  status:      { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot:         { width: sizes.dot, height: sizes.dot, borderRadius: sizes.dot / 2 },
  statusText:  { ...type.caption, color: colors.textSecondary },
  legendCard:  { overflow: "hidden" },
  banner:      { width: "100%", height: sizes.iconHero * 1.5, backgroundColor: colors.surfaceHigh },
  legendBody:  { padding: spacing.lg },
  legendStats: { flexDirection: "row", justifyContent: "space-around" },
  legendStat:  { alignItems: "center", flex: 1, gap: spacing.xxs },
  legendValue: { ...type.stat, color: colors.text },
  legendName:  { ...type.micro, color: colors.textMuted },
});
