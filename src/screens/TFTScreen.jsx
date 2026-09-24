import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, Image, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { searchTFTPlayer } from "../api/tft";
import { TIER_ICONS, FAVORITES_KEY } from "../constants/config";
import { championIcon } from "../api/ddragon";
import { errorMessage, winrate } from "../utils/lol";
import { Card, SectionLabel, ProfileHeader, OverallCard } from "../components/ui";
import {
  colors, radii, sizes, spacing, fontSizes, type, winrateColor, useAccent,
} from "../theme";

const GAME = "tft";

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
  if (p === 1) return colors.placement.first;
  if (p === 2) return colors.placement.second;
  if (p === 3) return colors.placement.third;
  if (p <= 4)  return colors.win;
  return colors.loss;
}

const unitBorder = tier =>
  tier === 3 ? colors.placement.first : tier === 2 ? colors.placement.second : colors.surfaceHigh;

function MatchCard({ match, puuid }) {
  const accent = useAccent(GAME);
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
        style={[styles.matchRow, {
          borderLeftColor: color,
          backgroundColor: expanded ? colors.surface : colors.bg,
        }]}
      >
        <View style={[styles.placementBox, { borderColor: color }]}>
          <Text style={[styles.placementNum, { color }]}>#{placement}</Text>
        </View>

        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={[styles.placementLabel, { color }]}>
              {placement === 1 ? "🏆 1er lugar" : placement <= 4 ? `Top ${placement}` : `${placement}° lugar`}
            </Text>
            <Text style={styles.meta}>{dur} · {ago}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.units}>
            {me.units?.slice(0, 8).map((u, i) => (
              <View key={i} style={[styles.unitBox, { borderColor: unitBorder(u.tier) }]}>
                <Image
                  source={{ uri: championIcon(u.character_id?.replace("TFT_Mobile_", "").replace(/.*_/, "")) }}
                  style={styles.unitImg}
                />
                {u.tier > 1 && (
                  <Text style={[styles.unitTier, { color: unitBorder(u.tier) }]}>{"★".repeat(u.tier)}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.right}>
          <Text style={[styles.level, { color }]}>Lvl {me.level}</Text>
          <Text style={styles.dmg}>{me.total_damage_to_players} dmg</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.matchDetail}>
          <SectionLabel>Todos los jugadores</SectionLabel>
          {[...match.info.participants]
            .sort((a, b) => a.placement - b.placement)
            .map(p => {
              const isMe = p.puuid === puuid;
              return (
                <View key={p.puuid} style={[styles.playerRow, isMe && { backgroundColor: colors.surfaceRaised, borderLeftColor: accent }]}>
                  <View style={[styles.smallPlacement, { borderColor: placementColor(p.placement) }]}>
                    <Text style={[styles.smallPlacementNum, { color: placementColor(p.placement) }]}>#{p.placement}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.playerName, isMe && { color: accent }]}>
                      {p.augments?.length > 0 ? "⬡ " : ""}{isMe ? "Tú" : `Jugador ${p.placement}`}
                    </Text>
                    <Text style={styles.playerLevel}>Nivel {p.level}</Text>
                  </View>
                  <Text style={[styles.playerDmg, { color: accent }]}>{p.total_damage_to_players} dmg</Text>
                </View>
              );
            })}
        </View>
      )}
    </View>
  );
}

export default function TFTScreen({ route }) {
  const accent = useAccent(GAME);
  const [data,       setData]       = useState(route.params.data);
  const [refreshing, setRefreshing] = useState(false);
  const [isFav,      setIsFav]      = useState(false);

  const { account, summoner, ranked, matches } = data;
  const tftRanked = ranked?.find(r => r.queueType === "RANKED_TFT");
  const rankedWr  = tftRanked ? winrate(tftRanked.wins, tftRanked.losses) : 0;

  const myPlacements = (matches || [])
    .map(m => m.info?.participants?.find(p => p.puuid === account.puuid)?.placement)
    .filter(p => p != null);
  const games        = myPlacements.length;
  const avgPlacement = games ? (myPlacements.reduce((a, p) => a + p, 0) / games).toFixed(1) : null;
  const top4Rate     = games ? Math.round((myPlacements.filter(p => p <= 4).length / games) * 100) : 0;
  const wins         = myPlacements.filter(p => p === 1).length;

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
          game:     GAME,
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
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      <ProfileHeader
        game={GAME}
        avatar={
          <View style={[styles.avatar, { borderColor: accent }]}>
            <Text style={styles.avatarEmoji}>♟️</Text>
          </View>
        }
        name={account.gameName}
        tag={account.tagLine}
        badge={tftRanked ? `${TIER_ICONS[tftRanked.tier]} ${tftRanked.tier} ${tftRanked.rank} · ${tftRanked.leaguePoints} LP` : null}
        action={isFav ? "⭐" : "☆"}
        onAction={toggleFavorite}
      />

      {tftRanked && (
        <Card accent={colors.tier[tftRanked.tier] || colors.textMuted}>
          <SectionLabel>Ranked TFT</SectionLabel>
          <View style={styles.rankedRow}>
            <Text style={styles.rankedIcon}>{TIER_ICONS[tftRanked.tier] || "🏆"}</Text>
            <View>
              <Text style={[styles.tierText, { color: colors.tier[tftRanked.tier] }]}>
                {tftRanked.tier} {tftRanked.rank}
              </Text>
              <Text style={[styles.lpText, { color: accent }]}>{tftRanked.leaguePoints} LP</Text>
            </View>
            <View style={styles.rankedRecord}>
              <Text style={styles.recordText}>{tftRanked.wins}V / {tftRanked.losses}D</Text>
              <Text style={[styles.wrText, { color: winrateColor(rankedWr, accent) }]}>{rankedWr}% WR</Text>
            </View>
          </View>
        </Card>
      )}

      {avgPlacement && (
        <OverallCard
          label={`Resumen — últimas ${games} partidas`}
          blocks={[
            { title: "Placement", value: avgPlacement, sub: "promedio", color: parseFloat(avgPlacement) <= 4 ? colors.win : colors.loss },
            { title: "Top 4 Rate", value: `${top4Rate}%`, sub: "top 4", color: winrateColor(top4Rate, accent) },
            { title: "Victorias", value: wins, sub: "1er lugar", color: colors.placement.first },
          ]}
        />
      )}

      <SectionLabel>Últimas partidas</SectionLabel>
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
  container:      { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.lg, paddingBottom: spacing.xxxl },
  flex:           { flex: 1 },
  avatar:         {
    width: sizes.avatarXl, height: sizes.avatarXl, borderRadius: sizes.avatarXl / 2,
    backgroundColor: colors.surfaceHigh, borderWidth: sizes.borderAccent,
    justifyContent: "center", alignItems: "center",
  },
  avatarEmoji:    { fontSize: fontSizes.hero },
  rankedRow:      { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rankedIcon:     { fontSize: fontSizes.hero },
  rankedRecord:   { marginLeft: "auto", alignItems: "flex-end" },
  tierText:       { ...type.heading },
  lpText:         { ...type.bodyStrong },
  recordText:     { ...type.small, color: colors.textSecondary },
  wrText:         { ...type.bodyStrong },
  matchRow:       {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, borderLeftWidth: sizes.borderAccent, borderRadius: radii.md, marginBottom: spacing.xs,
  },
  placementBox:   {
    width: sizes.placement, height: sizes.placement, borderRadius: radii.md,
    borderWidth: sizes.borderThick, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg,
  },
  placementNum:   { ...type.stat, fontSize: fontSizes.lg },
  titleRow:       { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  placementLabel: { ...type.label, fontSize: fontSizes.sm },
  meta:           { ...type.caption, color: colors.textMuted },
  units:          { marginTop: spacing.sm },
  unitBox:        {
    width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: radii.sm,
    borderWidth: sizes.hairline, marginRight: spacing.xs,
    overflow: "hidden", backgroundColor: colors.surfaceHigh,
  },
  unitImg:        { width: "100%", height: "100%" },
  unitTier:       { position: "absolute", bottom: 0, right: 1, fontSize: fontSizes.xxs, fontFamily: type.stat.fontFamily },
  right:          { alignItems: "flex-end" },
  level:          { ...type.bodyStrong },
  dmg:            { ...type.caption, color: colors.textMuted },
  matchDetail:    {
    backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, marginBottom: spacing.sm, padding: spacing.md,
  },
  playerRow:      {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.sm,
    borderLeftWidth: sizes.borderThick, borderLeftColor: "transparent", marginBottom: spacing.xs,
  },
  smallPlacement: {
    width: sizes.avatarSm, height: sizes.avatarSm, borderRadius: radii.sm,
    borderWidth: sizes.hairline, justifyContent: "center", alignItems: "center",
  },
  smallPlacementNum: { ...type.label, fontSize: fontSizes.sm },
  playerName:     { ...type.smallStrong, color: colors.textSecondary },
  playerLevel:    { ...type.caption, color: colors.textMuted },
  playerDmg:      { ...type.smallStrong },
  empty:          { ...type.body, color: colors.textFaint, textAlign: "center", marginTop: spacing.xl },
});
