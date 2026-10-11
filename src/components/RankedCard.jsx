import React from "react";
import { useT } from "../i18n/I18nProvider";
import { View, Text, StyleSheet } from "react-native";
import { Card, CountUp, ProgressBar, SectionLabel } from "./ui";
import RankEmblem from "./RankEmblem";
import Icon from "./Icon";
import { winrate, tierLabel } from "../utils/format";
import { colors, spacing, sizes, fontSizes, type, tracking, winrateColor, useAccent, withAlpha } from "../theme";

// Tarjeta de rango teñida con el color del tier. Sin `entry` muestra "Sin clasificar".
export default function RankedCard({ entry, label, game = "lol" }) {
  const t = useT();
  const accent = useAccent(game);

  if (!entry) {
    return (
      <Card style={styles.card}>
        <SectionLabel>{label}</SectionLabel>
        <Icon name="shield" size={sizes.avatarMd} color={colors.textMuted} style={styles.unrankedIcon} />
        <Text style={styles.unranked}>{t("ranked.unranked")}</Text>
        <Text style={styles.record}>{t("ranked.unrankedHint")}</Text>
      </Card>
    );
  }

  const { tier, rank, leaguePoints, wins, losses } = entry;
  const wr      = winrate(wins, losses);
  const color   = colors.tier[tier] || colors.textMuted;
  const wrColor = winrateColor(wr, accent);

  return (
    <Card style={[styles.card, { borderColor: withAlpha(color, 0.4), backgroundColor: withAlpha(color, 0.06) }]}>
      <SectionLabel>{label}</SectionLabel>
      <View style={styles.top}>
        <RankEmblem tier={tier} size={sizes.avatarXl - spacing.lg} />
        <View style={styles.lpBox}>
          <CountUp value={leaguePoints} style={styles.lp} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} />
          <Text style={styles.lpUnit}>LP</Text>
        </View>
      </View>
      <Text style={[styles.tierText, { color }]} numberOfLines={1} adjustsFontSizeToFit>{tierLabel(tier, rank)}</Text>
      <View style={styles.recordRow}>
        <Text style={styles.record}>{wins}V · {losses}D</Text>
        <CountUp value={wr} format={v => `${v}%`} style={[styles.wr, { color: wrColor }]} />
      </View>
      <ProgressBar value={wr} color={wrColor} glowing style={styles.bar} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card:         { flex: 1, marginBottom: 0 },
  top:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  tierText:     { ...type.heading, fontSize: fontSizes.base, letterSpacing: tracking.tight, marginTop: spacing.xs, marginBottom: spacing.md },
  lpBox:        { alignItems: "flex-end", flexShrink: 1 },
  lp:           { ...type.statLarge, fontSize: fontSizes.xl, color: colors.text },
  lpUnit:       { ...type.captionStrong, color: colors.textMuted },
  recordRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  record:       { ...type.caption, color: colors.textSecondary },
  wr:           { ...type.stat, fontSize: fontSizes.lg },
  bar:          { marginTop: spacing.sm, height: sizes.bar },
  unrankedIcon: { marginVertical: spacing.xs },
  unranked:     { ...type.heading, color: colors.textSecondary },
});
