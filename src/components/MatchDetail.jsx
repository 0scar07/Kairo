import React, { useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { championIcon, itemIcon } from "../api/ddragon";
import { csOf, playerName } from "../utils/lol";

function formatDuration(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function ItemIcon({ itemId }) {
  const [failed, setFailed] = useState(false);
  if (!itemId || failed) return <View style={itemStyles.empty} />;
  return (
    <Image
      source={{ uri: itemIcon(itemId) }}
      style={itemStyles.icon}
      onError={() => setFailed(true)}
    />
  );
}

const itemStyles = StyleSheet.create({
  icon:  { width: 24, height: 24, borderRadius: 4, backgroundColor: "#1e2a3a" },
  empty: { width: 24, height: 24, borderRadius: 4, backgroundColor: "#1e2a3a" },
});

function PlayerRow({ p, isMe, maxDmg }) {
  const dmgPct   = (p.totalDamageDealtToChampions / maxDmg) * 100;
  const champImg = championIcon(p.championName);
  const items    = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];

  return (
    <View style={[styles.playerRow, isMe && styles.playerRowMe]}>
      <Image source={{ uri: champImg }} style={styles.champImg} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.playerName, isMe && { color: "#c89b3c" }]} numberOfLines={1}>
          {playerName(p)}
        </Text>
        {/* Items */}
        <View style={styles.itemsRow}>
          {items.map((id, i) => <ItemIcon key={i} itemId={id} />)}
        </View>
        {/* Barra de daño */}
        <View style={styles.dmgBarBg}>
          <View style={[styles.dmgBarFill, {
            width: `${dmgPct}%`,
            backgroundColor: p.win ? "#4fc97a" : "#e05555",
          }]} />
        </View>
      </View>
      <View style={styles.statsCol}>
        <Text style={styles.kdaText}>{p.kills}/{p.deaths}/{p.assists}</Text>
        <Text style={styles.dmgNum}>{Math.round(p.totalDamageDealtToChampions / 1000)}k dmg</Text>
        <Text style={styles.goldNum}>🪙 {Math.round(p.goldEarned / 1000)}k</Text>
        <Text style={styles.csNum}>{csOf(p)} CS</Text>
      </View>
    </View>
  );
}

export default function MatchDetail({ match, myPuuid }) {
  if (!match?.info) return null;
  const { participants, gameDuration } = match.info;
  const team1  = participants.filter(p => p.teamId === 100);
  const team2  = participants.filter(p => p.teamId === 200);
  const maxDmg = Math.max(1, ...participants.map(p => p.totalDamageDealtToChampions));

  // Stats del equipo
  function teamStats(team) {
    return {
      kills:  team.reduce((a, p) => a + p.kills, 0),
      gold:   Math.round(team.reduce((a, p) => a + p.goldEarned, 0) / 1000),
      damage: Math.round(team.reduce((a, p) => a + p.totalDamageDealtToChampions, 0) / 1000),
    };
  }

  const t1 = teamStats(team1);
  const t2 = teamStats(team2);

  return (
    <View style={styles.container}>
      {/* Resumen equipos */}
      <View style={styles.teamSummary}>
        <View style={styles.teamStat}>
          <Text style={[styles.teamStatVal, { color: team1[0]?.win ? "#4fc97a" : "#e05555" }]}>
            {t1.kills}
          </Text>
          <Text style={styles.teamStatLabel}>kills</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.teamStat}>
          <Text style={[styles.teamStatVal, { color: team2[0]?.win ? "#4fc97a" : "#e05555" }]}>
            {t2.kills}
          </Text>
          <Text style={styles.teamStatLabel}>kills</Text>
        </View>
      </View>

      {[{ team: team1, win: team1[0]?.win }, { team: team2, win: !team1[0]?.win }].map(({ team, win }, ti) => (
        <View key={ti} style={[styles.teamBlock, ti === 0 && styles.teamBorder]}>
          <Text style={[styles.teamLabel, { color: win ? "#4fc97a" : "#e05555" }]}>
            {win ? "✓ VICTORIA" : "✗ DERROTA"} · Equipo {ti + 1}
          </Text>
          {team.map(p => (
            <PlayerRow key={p.puuid} p={p} isMe={p.puuid === myPuuid} maxDmg={maxDmg} />
          ))}
        </View>
      ))}
      <Text style={styles.duration}>⏱ Duración: {formatDuration(gameDuration)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    {
    backgroundColor: "#0a0e17",
    borderWidth: 1, borderColor: "#1e2a3a",
    borderRadius: 10, overflow: "hidden", marginBottom: 8,
  },
  teamSummary:  {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 20,
    padding: 10, borderBottomWidth: 1, borderBottomColor: "#1e2a3a",
    backgroundColor: "#070b12",
  },
  teamStat:     { alignItems: "center" },
  teamStatVal:  { fontSize: 22, fontWeight: "900" },
  teamStatLabel:{ color: "#445566", fontSize: 10 },
  vs:           { color: "#334455", fontWeight: "900", fontSize: 12 },
  teamBlock:    { padding: 12 },
  teamBorder:   { borderBottomWidth: 1, borderBottomColor: "#1e2a3a" },
  teamLabel:    { fontWeight: "800", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  playerRow:    {
    flexDirection: "row", alignItems: "center",
    gap: 8, paddingVertical: 6, paddingHorizontal: 6,
    borderRadius: 6, borderLeftWidth: 2, borderLeftColor: "transparent",
    marginBottom: 4,
  },
  playerRowMe:  { backgroundColor: "#1a2535", borderLeftColor: "#c89b3c" },
  champImg:     { width: 32, height: 32, borderRadius: 4 },
  playerName:   { color: "#8899aa", fontSize: 11 },
  itemsRow:     { flexDirection: "row", gap: 2 },
  dmgBarBg:     { height: 3, backgroundColor: "#1e2a3a", borderRadius: 2, width: "90%" },
  dmgBarFill:   { height: "100%", borderRadius: 2 },
  statsCol:     { alignItems: "flex-end", gap: 2 },
  kdaText:      { color: "#dce8f5", fontSize: 12, fontWeight: "700" },
  dmgNum:       { color: "#e05555", fontSize: 10 },
  goldNum:      { color: "#c89b3c", fontSize: 10 },
  csNum:        { color: "#556677", fontSize: 10 },
  duration:     { textAlign: "center", color: "#445566", fontSize: 11, padding: 8 },
});