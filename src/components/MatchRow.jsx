import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { championIcon } from "../api/ddragon";
import { csOf, queueLabel } from "../utils/lol";

function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function formatDuration(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function MatchRow({ match, myPuuid, onPress, expanded }) {
  if (!match?.info) return null;
  const me = match.info.participants.find(p => p.puuid === myPuuid);
  if (!me) return null;

  const win      = me.win;
  const kda      = `${me.kills}/${me.deaths}/${me.assists}`;
  const kdaRatio = me.deaths === 0
    ? "Perfect"
    : ((me.kills + me.assists) / me.deaths).toFixed(2);
  const dmg = Math.round(me.totalDamageDealtToChampions / 1000);
  const ago = timeSince(match.info.gameCreation);
  const dur = formatDuration(match.info.gameDuration);
  const champImg = championIcon(me.championName);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, { borderLeftColor: win ? "#4fc97a" : "#e05555",
        backgroundColor: expanded ? (win ? "#0d2a1a" : "#2a0d0d") : (win ? "#0a1f14" : "#1f0a0a") }]}
      activeOpacity={0.7}
    >
      <Image source={{ uri: champImg }} style={styles.champImg} />
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.result, { color: win ? "#4fc97a" : "#e05555" }]}>
            {win ? "VICTORIA" : "DERROTA"}
          </Text>
          <Text style={styles.meta}>{dur} · {ago}</Text>
        </View>
        <Text style={styles.champName}>{me.championName}</Text>
        <Text style={styles.queue}>{queueLabel(match.info.queueId)}</Text>
      </View>
      <View style={styles.kdaBlock}>
        <Text style={styles.kdaText}>{kda}</Text>
        <Text style={[styles.kdaRatio, {
          color: kdaRatio === "Perfect" ? "#f1c40f"
               : parseFloat(kdaRatio) >= 3 ? "#4fc97a" : "#8899aa",
        }]}>{kdaRatio} KDA</Text>
      </View>
      <View style={styles.dmgBlock}>
        <Text style={styles.dmgText}>{dmg}k dmg</Text>
        <Text style={styles.csText}>{csOf(me)} CS</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    gap: 12, padding: 10, paddingHorizontal: 14,
    borderLeftWidth: 3, borderRadius: 8, marginBottom: 4,
  },
  champImg: { width: 40, height: 40, borderRadius: 6 },
  info:     { flex: 1 },
  topRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  result:   { fontWeight: "800", fontSize: 12, letterSpacing: 1 },
  meta:     { color: "#556677", fontSize: 11 },
  champName:{ color: "#dce8f5", fontWeight: "700", fontSize: 13, marginTop: 2 },
  queue:    { color: "#556677", fontSize: 10, marginTop: 1 },
  kdaBlock: { alignItems: "flex-end" },
  kdaText:  { color: "#dce8f5", fontWeight: "700", fontSize: 13 },
  kdaRatio: { fontSize: 11 },
  dmgBlock: { alignItems: "flex-end", minWidth: 55 },
  dmgText:  { color: "#c89b3c", fontSize: 12, fontWeight: "600" },
  csText:   { color: "#556677", fontSize: 11 },
});
