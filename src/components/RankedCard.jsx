import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, ProgressBar, SectionLabel } from "./ui";
import { TIER_ICONS } from "../constants/config";
import { winrate } from "../utils/lol";
import { colors, spacing, fontSizes, type, tracking, winrateColor, useAccent } from "../theme";

// Tarjeta de rango. `game` define el color de acento (LP, barra media).
export default function RankedCard({ entry, label, game = "lol" }) {
  const accent = useAccent(game);
  if (!entry) return null;
  const { tier, rank, leaguePoints, wins, losses } = entry;
  const wr    = winrate(wins, losses);
  const color = colors.tier[tier] || colors.textMuted;
  const wrColor = winrateColor(wr, accent);

  return (
    <Card accent={color} style={styles.card}>
      <SectionLabel>{label}</SectionLabel>
      <Text style={styles.tierIcon}>{TIER_ICONS[tier] || "🏆"}</Text>
      <Text style={[styles.tierText, { color }]}>{tier} {rank}</Text>
      <Text style={[styles.lpText, { color: accent }]}>{leaguePoints} LP</Text>
      <Text style={styles.record}>
        {wins}V / {losses}D{"  "}
        <Text style={[styles.wr, { color: wrColor }]}>{wr}%</Text>
      </Text>
      <ProgressBar value={wr} color={wrColor} glowing style={styles.bar} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card:     { flex: 1, marginBottom: 0 },
  tierIcon: { fontSize: fontSizes.xxl, marginBottom: spacing.xs },
  tierText: { ...type.heading, letterSpacing: tracking.wide },
  lpText:   { ...type.bodyStrong },
  record:   { ...type.caption, color: colors.textSecondary, marginTop: spacing.sm },
  wr:       { ...type.captionStrong },
  bar:      { marginTop: spacing.sm },
});
