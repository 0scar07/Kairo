import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Image, TouchableOpacity, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { searchValorantPlayer } from "../api/valorant";
import { FAVORITES_KEY } from "../constants/config";
import { profileIconUrl } from "../api/ddragon";
import { errorMessage, kdaRatio as calcKda, winrate } from "../utils/lol";
import { SectionLabel, ProfileHeader, OverallCard } from "../components/ui";
import {
  colors, radii, sizes, spacing, fontSizes, type, tracking, kdaColor, winrateColor, glow, useAccent,
} from "../theme";

const GAME = "valorant";

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
    games, wr: winrate(wins, games - wins),
    wins, losses: games - wins,
    kda:        calcKda(kills, deaths, assists),
    avgKills:   (kills   / games).toFixed(1),
    avgDeaths:  (deaths  / games).toFixed(1),
    avgAssists: (assists / games).toFixed(1),
  };
}

const acsOf = (p, match) => Math.round((p.stats?.score || 0) / (match.metadata?.rounds_played || 1));

function MatchCard({ match, puuid }) {
  const accent = useAccent(GAME);
  const [expanded, setExpanded] = useState(false);
  if (!match?.players) return null;

  const me = match.players?.all_players?.find(p => p.puuid === puuid);
  if (!me) return null;

  const myTeam = me.team;
  const won    = (myTeam === "Red"  && match.teams?.red?.has_won) ||
                 (myTeam === "Blue" && match.teams?.blue?.has_won);
  const resultColor = won ? colors.win : colors.loss;
  const kda      = `${me.stats?.kills}/${me.stats?.deaths}/${me.stats?.assists}`;
  const kdaRatio = calcKda(me.stats?.kills || 0, me.stats?.deaths || 0, me.stats?.assists || 0);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={[styles.matchRow, {
          backgroundColor: expanded ? (won ? colors.winBgStrong : colors.lossBgStrong) : (won ? colors.winBg : colors.lossBg),
          borderLeftColor: resultColor,
        }]}
      >
        <View style={styles.agentIcon}>
          <Text style={styles.agentEmoji}>🎯</Text>
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={[styles.result, { color: resultColor }]}>{won ? "VICTORIA" : "DERROTA"}</Text>
            <Text style={styles.mapName}>{match.metadata?.map || ""}</Text>
          </View>
          <Text style={styles.agentName}>{me.character}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.kdaText}>{kda}</Text>
          <Text style={[styles.kdaRatio, { color: kdaColor(kdaRatio) }]}>{kdaRatio} KDA</Text>
        </View>
        <View style={styles.acsBlock}>
          <Text style={[styles.acs, { color: accent }]}>{acsOf(me, match)} ACS</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.matchDetail}>
          {["Red", "Blue"].map(team => {
            const teamWon = match.teams?.[team.toLowerCase()]?.has_won;
            return (
              <View key={team} style={[styles.teamBlock, team === "Red" && styles.teamBorder]}>
                <Text style={[styles.teamLabel, { color: teamWon ? colors.win : colors.loss }]}>
                  {teamWon ? "✓ VICTORIA" : "✗ DERROTA"} · {team}
                </Text>
                {match.players?.all_players
                  ?.filter(p => p.team === team)
                  .map(p => {
                    const isMe = p.puuid === puuid;
                    return (
                      <View key={p.puuid} style={[styles.playerRow, isMe && { backgroundColor: colors.surfaceRaised, borderLeftColor: accent }]}>
                        <Text style={styles.playerEmoji}>🎯</Text>
                        <View style={styles.flex}>
                          <Text style={[styles.playerName, isMe && { color: accent }]}>{p.name}</Text>
                          <Text style={styles.agentSmall}>{p.character}</Text>
                        </View>
                        <Text style={styles.playerKda}>{p.stats?.kills}/{p.stats?.deaths}/{p.stats?.assists}</Text>
                        <Text style={[styles.playerAcs, { color: accent }]}>{acsOf(p, match)} ACS</Text>
                      </View>
                    );
                  })}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function ValorantScreen({ route }) {
  const accent = useAccent(GAME);
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
          <Image
            source={{ uri: profileIconUrl(summoner?.profileIconId) }}
            style={[styles.profileIcon, { borderColor: accent }, glow(accent, spacing.md, 0.35)]}
          />
        }
        name={account.gameName}
        tag={account.tagLine}
        badge="🎯 Valorant"
        action={isFav ? "⭐" : "☆"}
        onAction={toggleFavorite}
      />

      {overall && (
        <OverallCard
          label={`Resumen — últimas ${overall.games} partidas`}
          blocks={[
            { title: "Winrate", value: `${overall.wr}%`, color: winrateColor(overall.wr, accent), sub: `${overall.wins}V ${overall.losses}D` },
            { title: "KDA Prom.", value: overall.kda, color: kdaColor(overall.kda, colors.text), sub: `${overall.avgKills}/${overall.avgDeaths}/${overall.avgAssists}` },
            { title: "Jugadas", value: overall.games, color: accent, sub: "partidas" },
          ]}
          bar={{ value: overall.wr, color: winrateColor(overall.wr, accent) }}
        />
      )}

      <SectionLabel>Últimas partidas</SectionLabel>
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
  container:    { flex: 1, backgroundColor: colors.bg },
  content:      { padding: spacing.lg, paddingBottom: spacing.xxxl },
  flex:         { flex: 1 },
  profileIcon:  {
    width: sizes.avatarXl, height: sizes.avatarXl, borderRadius: sizes.avatarXl / 2,
    borderWidth: sizes.borderAccent, backgroundColor: colors.surfaceHigh,
  },
  matchRow:     {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, borderLeftWidth: sizes.borderAccent, borderRadius: radii.md, marginBottom: spacing.xs,
  },
  agentIcon:    {
    width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: sizes.avatarLg / 2,
    backgroundColor: colors.surfaceHigh, justifyContent: "center", alignItems: "center",
  },
  agentEmoji:   { fontSize: fontSizes.xl },
  titleRow:     { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  result:       { ...type.label, fontSize: fontSizes.sm, letterSpacing: tracking.wide },
  mapName:      { ...type.caption, color: colors.textMuted },
  agentName:    { ...type.bodyStrong, color: colors.text, marginTop: spacing.xxs },
  right:        { alignItems: "flex-end" },
  kdaText:      { ...type.bodyStrong, color: colors.text },
  kdaRatio:     { ...type.caption },
  acsBlock:     { alignItems: "flex-end", minWidth: spacing.xxxl + spacing.sm },
  acs:          { ...type.smallStrong },
  matchDetail:  {
    backgroundColor: colors.bg, borderWidth: sizes.hairline, borderColor: colors.border,
    borderRadius: radii.md, marginBottom: spacing.sm, overflow: "hidden",
  },
  teamBlock:    { padding: spacing.md },
  teamBorder:   { borderBottomWidth: sizes.hairline, borderBottomColor: colors.border },
  teamLabel:    { ...type.label, fontSize: fontSizes.xs, letterSpacing: tracking.wide, marginBottom: spacing.sm },
  playerRow:    {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.sm,
    borderLeftWidth: sizes.borderThick, borderLeftColor: "transparent", marginBottom: spacing.xs,
  },
  playerEmoji:  { fontSize: fontSizes.lg },
  playerName:   { ...type.smallStrong, color: colors.textSecondary },
  agentSmall:   { ...type.caption, color: colors.textMuted },
  playerKda:    { ...type.smallStrong, color: colors.text },
  playerAcs:    { ...type.caption, minWidth: spacing.xxxl + spacing.sm, textAlign: "right" },
  empty:        { ...type.body, color: colors.textFaint, textAlign: "center", marginTop: spacing.xl },
});
