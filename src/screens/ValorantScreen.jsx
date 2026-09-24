import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Image, TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { searchValorantPlayer } from "../api/valorant";
import { DD } from "../constants/config";

const FAVORITES_KEY = "loltracker_favorites";

function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function getOverallStats(matches, puuid) {
  if (!matches?.length) return null;
  let wins = 0, kills = 0, deaths = 0, assists = 0, games = 0;
  matches.forEach(m => {
    const me = m.players?.all_players?.find(p => p.puuid === puuid);
    if (!me) return;
    games++;
    if (m.teams?.red?.has_won  && me.team === "Red")  wins++;
    if (m.teams?.blue?.has_won && me.team === "Blue") wins++;
    kills   += me.stats?.kills   || 0;
    deaths  += me.stats?.deaths  || 0;
    assists += me.stats?.assists || 0;
  });
  if (!games) return null;
  return {
    games, wr: Math.round((wins / games) * 100),
    wins, losses: games - wins,
    kda:        deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2),
    avgKills:   (kills   / games).toFixed(1),
    avgDeaths:  (deaths  / games).toFixed(1),
    avgAssists: (assists / games).toFixed(1),
  };
}

function MatchCard({ match, puuid }) {
  const [expanded, setExpanded] = useState(false);
  if (!match?.players) return null;

  const me = match.players?.all_players?.find(p => p.puuid === puuid);
  if (!me) return null;

  const myTeam = me.team;
  const won    = (myTeam === "Red"  && match.teams?.red?.has_won) ||
                 (myTeam === "Blue" && match.teams?.blue?.has_won);
  const kda    = `${me.stats?.kills}/${me.stats?.deaths}/${me.stats?.assists}`;
  const kdaRatio = me.stats?.deaths === 0
    ? "Perfect"
    : ((me.stats?.kills + me.stats?.assists) / me.stats?.deaths).toFixed(2);
  const acs = Math.round((me.stats?.score || 0) / (match.metadata?.rounds_played || 1));

  return (
    <View>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={[styles.matchRow, {
          backgroundColor: expanded ? (won ? "#0d2a1a" : "#2a0d0d") : (won ? "#0a1f14" : "#1f0a0a"),
          borderLeftColor: won ? "#4fc97a" : "#e05555",
        }]}
      >
        <View style={styles.agentIcon}>
          <Text style={{ fontSize: 22 }}>🎯</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={[styles.result, { color: won ? "#4fc97a" : "#e05555" }]}>
              {won ? "VICTORIA" : "DERROTA"}
            </Text>
            <Text style={styles.mapName}>{match.metadata?.map || ""}</Text>
          </View>
          <Text style={styles.agentName}>{me.character}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.kdaText}>{kda}</Text>
          <Text style={[styles.kdaRatio, {
            color: kdaRatio === "Perfect" ? "#f1c40f"
                 : parseFloat(kdaRatio) >= 3 ? "#4fc97a" : "#8899aa",
          }]}>{kdaRatio} KDA</Text>
        </View>
        <View style={{ alignItems: "flex-end", minWidth: 55 }}>
          <Text style={styles.acs}>{acs} ACS</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.matchDetail}>
          {["Red", "Blue"].map(team => (
            <View key={team} style={[styles.teamBlock, team === "Red" && styles.teamBorder]}>
              <Text style={[styles.teamLabel, {
                color: match.teams?.[team.toLowerCase()]?.has_won ? "#4fc97a" : "#e05555",
              }]}>
                {match.teams?.[team.toLowerCase()]?.has_won ? "✓ VICTORIA" : "✗ DERROTA"} · {team}
              </Text>
              {match.players?.all_players
                ?.filter(p => p.team === team)
                .map(p => (
                  <View key={p.puuid} style={[
                    styles.playerRow,
                    p.puuid === puuid && styles.playerRowMe,
                  ]}>
                    <Text style={{ fontSize: 18 }}>🎯</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.playerName, p.puuid === puuid && { color: "#ff4655" }]}>
                        {p.name}
                      </Text>
                      <Text style={styles.agentSmall}>{p.character}</Text>
                    </View>
                    <Text style={styles.playerKda}>
                      {p.stats?.kills}/{p.stats?.deaths}/{p.stats?.assists}
                    </Text>
                    <Text style={styles.playerAcs}>
                      {Math.round((p.stats?.score || 0) / (match.metadata?.rounds_played || 1))} ACS
                    </Text>
                  </View>
                ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ValorantScreen({ route }) {
  const [data,       setData]       = useState(route.params.data);
  const [refreshing, setRefreshing] = useState(false);
  const [isFav,      setIsFav]      = useState(false);

  const { account, summoner, matches } = data;
  const overall = getOverallStats(matches, account.puuid);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const fresh = await searchValorantPlayer(account.gameName, account.tagLine);
      setData(fresh);
    } catch (_) {}
    setRefreshing(false);
  }

  async function toggleFavorite() {
    try {
      const raw  = await AsyncStorage.getItem(FAVORITES_KEY);
      let favs   = raw ? JSON.parse(raw) : [];
      if (isFav) {
        favs = favs.filter(f => f.puuid !== account.puuid);
      } else {
        favs.push({
          puuid:    account.puuid,
          gameName: account.gameName,
          tagLine:  account.tagLine,
          game:     "valorant",
          iconId:   summoner?.profileIconId || null,
        });
      }
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
      setIsFav(!isFav);
    } catch (_) {}
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff4655" />
      }
    >
      {/* Perfil */}
      <View style={styles.profileCard}>
        <Image
          source={{ uri: `${DD}/img/profileicon/${summoner?.profileIconId}.png` }}
          style={styles.profileIcon}
        />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={styles.gameName}>{account.gameName}</Text>
          <Text style={styles.tagLine}>#{account.tagLine}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🎯 Valorant</Text>
          </View>
        </View>
        <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn}>
          <Text style={{ fontSize: 24 }}>{isFav ? "⭐" : "☆"}</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      {overall && (
        <View style={styles.overallCard}>
          <Text style={styles.sectionLabel}>RESUMEN — ÚLTIMAS {overall.games} PARTIDAS</Text>
          <View style={styles.overallRow}>
            <View style={styles.overallBlock}>
              <Text style={[styles.bigNum, {
                color: overall.wr >= 55 ? "#4fc97a" : overall.wr >= 50 ? "#c89b3c" : "#e05555",
              }]}>{overall.wr}%</Text>
              <Text style={styles.overallSub}>{overall.wins}V {overall.losses}D</Text>
              <Text style={styles.overallTitle}>Winrate</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.overallBlock}>
              <Text style={[styles.bigNum, {
                color: overall.kda === "Perfect" ? "#f1c40f"
                     : parseFloat(overall.kda) >= 3 ? "#4fc97a" : "#dce8f5",
              }]}>{overall.kda}</Text>
              <Text style={styles.overallSub}>
                {overall.avgKills}/{overall.avgDeaths}/{overall.avgAssists}
              </Text>
              <Text style={styles.overallTitle}>KDA Prom.</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.overallBlock}>
              <Text style={[styles.bigNum, { color: "#ff4655" }]}>{overall.games}</Text>
              <Text style={styles.overallSub}>partidas</Text>
              <Text style={styles.overallTitle}>Jugadas</Text>
            </View>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, {
              width: `${overall.wr}%`,
              backgroundColor: overall.wr >= 55 ? "#4fc97a" : overall.wr >= 50 ? "#c89b3c" : "#e05555",
            }]} />
          </View>
        </View>
      )}

      {/* Partidas */}
      <Text style={styles.sectionLabel}>ÚLTIMAS PARTIDAS</Text>
      {matches?.length > 0
        ? matches.map((m, i) => (
            <MatchCard key={m.metadata?.matchid || i} match={m} puuid={account.puuid} />
          ))
        : <Text style={styles.empty}>No se encontraron partidas</Text>
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#070b12" },
  profileCard:  {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 12, padding: 16, marginBottom: 14,
  },
  profileIcon:  {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: "#ff4655",
    backgroundColor: "#1e2a3a",
  },
  gameName:     { color: "#dce8f5", fontWeight: "900", fontSize: 20 },
  tagLine:      { color: "#556677", fontSize: 13 },
  badge:        {
    marginTop: 6, alignSelf: "flex-start",
    backgroundColor: "#0a0e17", paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  badgeText:    { color: "#ff4655", fontWeight: "700", fontSize: 12 },
  favBtn:       { padding: 8 },
  overallCard:  {
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 12, padding: 14, marginBottom: 14,
  },
  overallRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  overallBlock: { alignItems: "center", gap: 3 },
  bigNum:       { fontSize: 22, fontWeight: "900" },
  overallSub:   { color: "#8899aa", fontSize: 11 },
  overallTitle: { color: "#445566", fontSize: 10, letterSpacing: 1 },
  divider:      { width: 1, height: 50, backgroundColor: "#1e2a3a" },
  barBg:        { height: 4, backgroundColor: "#1e2a3a", borderRadius: 2, marginTop: 12 },
  barFill:      { height: "100%", borderRadius: 2 },
  sectionLabel: { fontSize: 10, color: "#445566", letterSpacing: 1, marginBottom: 8 },
  matchRow:     {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderLeftWidth: 3, borderRadius: 8, marginBottom: 4,
  },
  agentIcon:    {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1e2a3a", justifyContent: "center", alignItems: "center",
  },
  result:       { fontWeight: "800", fontSize: 12, letterSpacing: 1 },
  mapName:      { color: "#556677", fontSize: 11 },
  agentName:    { color: "#dce8f5", fontWeight: "700", fontSize: 13, marginTop: 2 },
  kdaText:      { color: "#dce8f5", fontWeight: "700", fontSize: 13 },
  kdaRatio:     { fontSize: 11 },
  acs:          { color: "#ff4655", fontSize: 12, fontWeight: "700" },
  matchDetail:  {
    backgroundColor: "#0a0e17", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 10, marginBottom: 8, overflow: "hidden",
  },
  teamBlock:    { padding: 12 },
  teamBorder:   { borderBottomWidth: 1, borderBottomColor: "#1e2a3a" },
  teamLabel:    { fontWeight: "800", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  playerRow:    {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 6, paddingHorizontal: 6, borderRadius: 6,
    borderLeftWidth: 2, borderLeftColor: "transparent", marginBottom: 4,
  },
  playerRowMe:  { backgroundColor: "#1a2535", borderLeftColor: "#ff4655" },
  playerName:   { color: "#8899aa", fontSize: 12, fontWeight: "600" },
  agentSmall:   { color: "#445566", fontSize: 11 },
  playerKda:    { color: "#dce8f5", fontSize: 12, fontWeight: "600" },
  playerAcs:    { color: "#ff4655", fontSize: 11, minWidth: 55, textAlign: "right" },
  empty:        { color: "#334455", textAlign: "center", marginTop: 20 },
});