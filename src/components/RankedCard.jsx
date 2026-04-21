import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TIER_COLORS, TIER_ICONS } from "../constants/config";

export default function RankedCard({ entry, label }) {
  if (!entry) return null;
  const { tier, rank, leaguePoints, wins, losses } = entry;
  const total = wins + losses;
  const wr    = Math.round((wins / total) * 100);
  const color = TIER_COLORS[tier] || "#888";

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.queueLabel}>{label}</Text>
      <Text style={styles.tierIcon}>{TIER_ICONS[tier] || "🏆"}</Text>
      <Text style={[styles.tierText, { color }]}>{tier} {rank}</Text>
      <Text style={styles.lpText}>{leaguePoints} LP</Text>
      <Text style={styles.record}>
        {wins}W / {losses}L{"  "}
        <Text style={{ color: wr >= 55 ? "#4fc97a" : wr >= 50 ? "#c89b3c" : "#e05555", fontWeight: "700" }}>
          {wr}%
        </Text>
      </Text>
      {/* Barra de winrate */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, {
          width: `${wr}%`,
          backgroundColor: wr >= 55 ? "#4fc97a" : wr >= 50 ? "#c89b3c" : "#e05555",
        }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#0f1923",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#1e2a3a",
    borderRightColor: "#1e2a3a",
    borderBottomColor: "#1e2a3a",
  },
  queueLabel: {
    color: "#445566",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  tierIcon: { fontSize: 22, marginBottom: 4 },
  tierText: { fontWeight: "800", fontSize: 15, letterSpacing: 1 },
  lpText:   { color: "#c89b3c", fontWeight: "700", fontSize: 13 },
  record:   { color: "#8899aa", fontSize: 11, marginTop: 6 },
  barBg: {
    marginTop: 8, height: 4, borderRadius: 2,
    backgroundColor: "#1e2a3a", overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 2 },
});
