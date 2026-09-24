import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, ProgressBar, SectionLabel } from "./ui";
import { TIER_ICONS } from "../constants/config";
import { winrate } from "../utils/format";
import { colors, spacing, sizes, fontSizes, type, tracking, winrateColor, useAccent, withAlpha } from "../theme";

// Tarjeta de rango teñida con el color del tier. Sin `entry` muestra "Sin clasificar".
export default function RankedCard({ entry, label, game = "lol" }) {
  const accent = useAccent(game);

  if (!entry) {
    return (
      <Card style={styles.card}>
        <SectionLabel>{label}</SectionLabel>
        <Text style={styles.unrankedIcon}>🛡️</Text>
        <Text style={styles.unranked}>Sin clasificar</Text>
        <Text style={styles.record}>Aún no juega partidas de este modo</Text>
      </Card>
    );
  }

  const { tier, rank, leaguePoints, wins, losses } = entry;
  const wr      = winrate(wins, losses);
  const color   = colors.tier[tier] || colors.textMuted;
  const wrColor = winrateColor(wr, accent);
  const apex    = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier);   // no tienen división

  return (
    <Card style={[styles.card, { borderColor: withAlpha(color, 0.4), backgroundColor: withAlpha(color, 0.06) }]}>
      <SectionLabel>{label}</SectionLabel>
      <View style={styles.top}>
        <Text style={styles.tierIcon}>{TIER_ICONS[tier] || "🏆"}</Text>
        <View style={styles.tierInfo}>
          <Text style={[styles.tierText, { color }]} numberOfLines={1}>{tier}{apex ? "" : ` ${rank}`}</Text>
          <Text style={styles.lp}>{leaguePoints} LP</Text>
        </View>
      </View>
      <View style={styles.recordRow}>
        <Text style={styles.record}>{wins}V · {losses}D</Text>
        <Text style={[styles.wr, { color: wrColor }]}>{wr}%</Text>
      </View>
      <ProgressBar value={wr} color={wrColor} glowing style={styles.bar} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card:         { flex: 1, marginBottom: 0 },
  top:          { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  tierIcon:     { fontSize: fontSizes.hero },
  tierInfo:     { flex: 1 },
  tierText:     { ...type.heading, letterSpacing: tracking.wide },
  lp:           { ...type.statLarge, fontSize: fontSizes.xl, color: colors.text },
  recordRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  record:       { ...type.caption, color: colors.textSecondary },
  wr:           { ...type.stat, fontSize: fontSizes.lg },
  bar:          { marginTop: spacing.sm, height: sizes.bar },
  unrankedIcon: { fontSize: fontSizes.xxl, marginBottom: spacing.xs },
  unranked:     { ...type.heading, color: colors.textSecondary },
});
