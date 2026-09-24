import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, Image, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { searchTFTPlayer } from "../api/tft";
import { TIER_COLORS, TIER_ICONS, FAVORITES_KEY } from "../constants/config";
import { championIcon } from "../api/ddragon";
import { errorMessage } from "../utils/lol";

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

function placementColor(p) {
  if (p === 1) return "#FFD700";
  if (p === 2) return "#C0C0C0";
  if (p === 3) return "#cd7f32";
  if (p <= 4)  return "#4fc97a";
  return "#e05555";
}

function MatchCard({ match, puuid }) {
  const [expanded, setExpanded] = useState(false);
  if (!match?.info) return null;

  const me = match.info.participants?.find(p => p.puuid === puuid);
  if (!me) return null;

  const placement = me.placement;
  const color     = placementColor(placement);
  const ago       = timeSince(match.info.game_datetime);
  const dur       = formatDuration(Math.floor(match.info.game_length));

  return (
    <View>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={[styles.matchRow, { borderLeftColor: color,
          backgroundColor: expanded ? "#0f1923" : "#0a0e17" }]}
      >
        {/* Placement */}
        <View style={[styles.placementBox, { borderColor: color }]}>
          <Text style={[styles.placementNum, { color }]}>#{placement}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={[styles.placementLabel, { color }]}>
              {placement === 1 ? "🏆 1er lugar" :
               placement <= 4  ? `Top ${placement}` : `${placement}° lugar`}
            </Text>
            <Text style={styles.meta}>{dur} · {ago}</Text>
          </View>
          {/* Unidades */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {me.units?.slice(0, 8).map((u, i) => (
              <View key={i} style={[styles.unitBox, { borderColor: u.tier === 3 ? "#FFD700" : u.tier === 2 ? "#C0C0C0" : "#1e2a3a" }]}>
                <Image
                  source={{ uri: championIcon(u.character_id?.replace("TFT_Mobile_", "").replace(/.*_/, "")) }}
                  style={styles.unitImg}
                />
                {u.tier > 1 && (
                  <Text style={[styles.unitTier, { color: u.tier === 3 ? "#FFD700" : "#C0C0C0" }]}>
                    {"★".repeat(u.tier)}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.level, { color }]}>Lvl {me.level}</Text>
          <Text style={styles.dmg}>{me.total_damage_to_players} dmg</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.matchDetail}>
          <Text style={styles.detailTitle}>TODOS LOS JUGADORES</Text>
          {match.info.participants
            ?.sort((a, b) => a.placement - b.placement)
            .map(p => (
              <View key={p.puuid} style={[
                styles.playerRow,
                p.puuid === puuid && styles.playerRowMe,
              ]}>
                <View style={[styles.smallPlacement, { borderColor: placementColor(p.placement) }]}>
                  <Text style={[styles.smallPlacementNum, { color: placementColor(p.placement) }]}>
                    #{p.placement}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerName, p.puuid === puuid && { color: "#0bc4e3" }]}>
                    {p.augments?.length > 0 ? "⬡ " : ""}{p.puuid === puuid ? "Tú" : `Jugador ${p.placement}`}
                  </Text>
                  <Text style={styles.playerLevel}>Nivel {p.level}</Text>
                </View>
                <Text style={styles.playerDmg}>{p.total_damage_to_players} dmg</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

export default function TFTScreen({ route }) {
  const [data,       setData]       = useState(route.params.data);
  const [refreshing, setRefreshing] = useState(false);
  const [isFav,      setIsFav]      = useState(false);

  const { account, summoner, ranked, matches } = data;
  const tftRanked = ranked?.find(r => r.queueType === "RANKED_TFT");

  // Stats generales
  const avgPlacement = matches?.length
    ? (matches.reduce((acc, m) => {
        const me = m.info?.participants?.find(p => p.puuid === account.puuid);
        return acc + (me?.placement || 0);
      }, 0) / matches.length).toFixed(1)
    : null;

  const top4Rate = matches?.length
    ? Math.round((matches.filter(m => {
        const me = m.info?.participants?.find(p => p.puuid === account.puuid);
        return me?.placement <= 4;
      }).length / matches.length) * 100)
    : null;

  const wins = matches?.filter(m => {
    const me = m.info?.participants?.find(p => p.puuid === account.puuid);
    return me?.placement === 1;
  }).length;

  async function onRefresh() {
    setRefreshing(true);
    try {
      const fresh = await searchTFTPlayer(account.gameName, account.tagLine);
      setData(fresh);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar: " + errorMessage(e));
    }
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
          game:     "tft",
          iconId:   summoner?.profileIconId || null,
          tier:     tftRanked?.tier || null,
          rank:     tftRanked?.rank || null,
        });
      }
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
      setIsFav(!isFav);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar favoritos: " + errorMessage(e));
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0bc4e3" />
      }
    >
      {/* Perfil */}
      <View style={styles.profileCard}>
        <View style={styles.profileIcon}>
          <Text style={{ fontSize: 32 }}>♟️</Text>
        </View>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={styles.gameName}>{account.gameName}</Text>
          <Text style={styles.tagLine}>#{account.tagLine}</Text>
          {tftRanked && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>
                {TIER_ICONS[tftRanked.tier]} {tftRanked.tier} {tftRanked.rank} · {tftRanked.leaguePoints} LP
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn}>
          <Text style={{ fontSize: 24 }}>{isFav ? "⭐" : "☆"}</Text>
        </TouchableOpacity>
      </View>

      {/* Ranked */}
      {tftRanked && (
        <View style={[styles.rankedCard, { borderLeftColor: TIER_COLORS[tftRanked.tier] || "#888" }]}>
          <Text style={styles.sectionLabel}>RANKED TFT</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 32 }}>{TIER_ICONS[tftRanked.tier] || "🏆"}</Text>
            <View>
              <Text style={[styles.tierText, { color: TIER_COLORS[tftRanked.tier] }]}>
                {tftRanked.tier} {tftRanked.rank}
              </Text>
              <Text style={styles.lpText}>{tftRanked.leaguePoints} LP</Text>
            </View>
            <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
              <Text style={styles.recordText}>
                {tftRanked.wins}V / {tftRanked.losses}D
              </Text>
              <Text style={[styles.wrText, {
                color: Math.round((tftRanked.wins / (tftRanked.wins + tftRanked.losses)) * 100) >= 55
                  ? "#4fc97a" : "#c89b3c"
              }]}>
                {Math.round((tftRanked.wins / (tftRanked.wins + tftRanked.losses)) * 100)}% WR
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Resumen */}
      {avgPlacement && (
        <View style={styles.overallCard}>
          <Text style={styles.sectionLabel}>RESUMEN — ÚLTIMAS {matches.length} PARTIDAS</Text>
          <View style={styles.overallRow}>
            <View style={styles.overallBlock}>
              <Text style={[styles.bigNum, {
                color: parseFloat(avgPlacement) <= 4 ? "#4fc97a" : "#e05555"
              }]}>{avgPlacement}</Text>
              <Text style={styles.overallSub}>promedio</Text>
              <Text style={styles.overallTitle}>Placement</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.overallBlock}>
              <Text style={[styles.bigNum, {
                color: top4Rate >= 55 ? "#4fc97a" : top4Rate >= 50 ? "#c89b3c" : "#e05555"
              }]}>{top4Rate}%</Text>
              <Text style={styles.overallSub}>top 4</Text>
              <Text style={styles.overallTitle}>Top 4 Rate</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.overallBlock}>
              <Text style={[styles.bigNum, { color: "#FFD700" }]}>{wins}</Text>
              <Text style={styles.overallSub}>1er lugar</Text>
              <Text style={styles.overallTitle}>Victorias</Text>
            </View>
          </View>
        </View>
      )}

      {/* Partidas */}
      <Text style={styles.sectionLabel}>ÚLTIMAS PARTIDAS</Text>
      {matches?.length > 0
        ? matches.map((m, i) => (
            <MatchCard key={m.metadata?.match_id || i} match={m} puuid={account.puuid} />
          ))
        : <Text style={styles.empty}>No se encontraron partidas</Text>
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#070b12" },
  profileCard:    {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 12, padding: 16, marginBottom: 14,
  },
  profileIcon:    {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#1e2a3a", borderWidth: 3,
    borderColor: "#0bc4e3", justifyContent: "center", alignItems: "center",
  },
  gameName:       { color: "#dce8f5", fontWeight: "900", fontSize: 20 },
  tagLine:        { color: "#556677", fontSize: 13 },
  tierBadge:      {
    marginTop: 6, alignSelf: "flex-start",
    backgroundColor: "#0a0e17", paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  tierBadgeText:  { color: "#0bc4e3", fontWeight: "700", fontSize: 12 },
  favBtn:         { padding: 8 },
  rankedCard:     {
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderLeftWidth: 3,
    borderRadius: 12, padding: 14, marginBottom: 14,
  },
  tierText:       { fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  lpText:         { color: "#0bc4e3", fontWeight: "700", fontSize: 13 },
  recordText:     { color: "#8899aa", fontSize: 12 },
  wrText:         { fontWeight: "700", fontSize: 13 },
  overallCard:    {
    backgroundColor: "#0f1923", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 12, padding: 14, marginBottom: 14,
  },
  overallRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  overallBlock:   { alignItems: "center", gap: 3 },
  bigNum:         { fontSize: 22, fontWeight: "900" },
  overallSub:     { color: "#8899aa", fontSize: 11 },
  overallTitle:   { color: "#445566", fontSize: 10, letterSpacing: 1 },
  divider:        { width: 1, height: 50, backgroundColor: "#1e2a3a" },
  sectionLabel:   { fontSize: 10, color: "#445566", letterSpacing: 1, marginBottom: 8 },
  matchRow:       {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderLeftWidth: 3, borderRadius: 8, marginBottom: 4,
  },
  placementBox:   {
    width: 44, height: 44, borderRadius: 8,
    borderWidth: 2, justifyContent: "center", alignItems: "center",
    backgroundColor: "#0a0e17",
  },
  placementNum:   { fontWeight: "900", fontSize: 16 },
  placementLabel: { fontWeight: "800", fontSize: 12 },
  meta:           { color: "#556677", fontSize: 11 },
  unitBox:        {
    width: 36, height: 36, borderRadius: 6,
    borderWidth: 1, marginRight: 4,
    overflow: "hidden", backgroundColor: "#1e2a3a",
  },
  unitImg:        { width: "100%", height: "100%" },
  unitTier:       { position: "absolute", bottom: 0, right: 1, fontSize: 8, fontWeight: "900" },
  level:          { fontWeight: "800", fontSize: 13 },
  dmg:            { color: "#556677", fontSize: 11 },
  matchDetail:    {
    backgroundColor: "#0a0e17", borderWidth: 1,
    borderColor: "#1e2a3a", borderRadius: 10, marginBottom: 8, padding: 12,
  },
  detailTitle:    { color: "#445566", fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  playerRow:      {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 6, paddingHorizontal: 6, borderRadius: 6,
    borderLeftWidth: 2, borderLeftColor: "transparent", marginBottom: 4,
  },
  playerRowMe:    { backgroundColor: "#1a2535", borderLeftColor: "#0bc4e3" },
  smallPlacement: {
    width: 30, height: 30, borderRadius: 6,
    borderWidth: 1, justifyContent: "center", alignItems: "center",
  },
  smallPlacementNum: { fontWeight: "800", fontSize: 12 },
  playerName:     { color: "#8899aa", fontSize: 12, fontWeight: "600" },
  playerLevel:    { color: "#445566", fontSize: 11 },
  playerDmg:      { color: "#0bc4e3", fontSize: 12, fontWeight: "600" },
  empty:          { color: "#334455", textAlign: "center", marginTop: 20 },
});