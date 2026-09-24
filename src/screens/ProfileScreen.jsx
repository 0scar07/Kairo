import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProfileIcon from "../components/ProfileIcon";
import RankedCard from "../components/RankedCard";
import MatchRow from "../components/MatchRow";
import MatchDetail from "../components/MatchDetail";
import ChampionStatsRow from "../components/ChampionStatsRow";
import { Card, SectionLabel, SegmentedTabs, Chip, ErrorBanner, ProfileHeader, OverallCard } from "../components/ui";
import { searchPlayer, getMoreMatches, MATCH_PAGE } from "../api/riot";
import { championIcon } from "../api/ddragon";
import { FAVORITES_KEY } from "../constants/config";
import { errorMessage, findMe, getChampionStats, getOverallStats, getStreak } from "../utils/lol";
import {
  colors, radii, sizes, spacing, type, kdaColor, winrateColor, useAccent, withAlpha,
} from "../theme";

const GAME = "lol";

const TABS = [
  { key: "partidas",  label: "🎮 PARTIDAS" },
  { key: "campeones", label: "🏆 CAMPEONES" },
];

const RESULT_FILTERS = [
  { key: "all",  label: "Todas" },
  { key: "win",  label: "✓ Victorias" },
  { key: "loss", label: "✗ Derrotas" },
];

export default function ProfileScreen({ route }) {
  const accent = useAccent(GAME);
  const [data,        setData]        = useState(route.params.data);
  const [activeMatch, setActiveMatch] = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [activeTab,   setActiveTab]   = useState("partidas");
  const [filterWin,   setFilterWin]   = useState("all");
  const [filterChamp, setFilterChamp] = useState("all");
  const [isFav,       setIsFav]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState(null);

  const { account, summoner, ranked, matches, hasMore, nextStart } = data;
  const soloQ      = ranked?.find(r => r.queueType === "RANKED_SOLO_5x5");
  const flex       = ranked?.find(r => r.queueType === "RANKED_FLEX_SR");
  const allChamps  = getChampionStats(matches || [], account.puuid);
  const champStats = allChamps.slice(0, 5);
  const overall    = getOverallStats(matches || [], account.puuid);
  const streak     = getStreak(matches || [], account.puuid);
  const topChamp   = champStats[0];

  const uniqueChamps = [...new Set(
    (matches || []).map(m => findMe(m, account.puuid)?.championName).filter(Boolean)
  )];

  const filteredMatches = (matches || []).filter(m => {
    const me = findMe(m, account.puuid);
    if (!me) return false;
    if (filterWin === "win"  && !me.win) return false;
    if (filterWin === "loss" &&  me.win) return false;
    if (filterChamp !== "all" && me.championName !== filterChamp) return false;
    return true;
  });

  useEffect(() => { checkFavorite(); }, []);

  async function checkFavorite() {
    try {
      const raw  = await AsyncStorage.getItem(FAVORITES_KEY);
      const favs = raw ? JSON.parse(raw) : [];
      setIsFav(favs.some(f => f.puuid === account.puuid));
    } catch (e) {
      console.warn("No se pudieron leer los favoritos:", e.message);
    }
  }

  async function toggleFavorite() {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      let favs  = raw ? JSON.parse(raw) : [];
      if (isFav) {
        favs = favs.filter(f => f.puuid !== account.puuid);
      } else {
        favs.push({
          game:     GAME,
          puuid:    account.puuid,
          gameName: account.gameName,
          tagLine:  account.tagLine,
          iconId:   summoner.profileIconId,
          tier:     soloQ?.tier || null,
          rank:     soloQ?.rank || null,
        });
      }
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
      setIsFav(!isFav);
    } catch (e) {
      setError("No se pudo actualizar favoritos: " + errorMessage(e));
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const fresh = await searchPlayer(account.gameName, account.tagLine);
      setData(fresh);
      setActiveMatch(null);
    } catch (e) {
      setError("No se pudo actualizar: " + errorMessage(e));
    }
    setRefreshing(false);
  }

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getMoreMatches(account.puuid, nextStart, MATCH_PAGE);
      setData(prev => {
        const known = new Set(prev.matches.map(m => m.metadata.matchId));
        const fresh = page.matches.filter(m => !known.has(m.metadata.matchId));
        return { ...prev, matches: [...prev.matches, ...fresh], hasMore: page.hasMore, nextStart: page.nextStart };
      });
    } catch (e) {
      setError("No se pudieron cargar más partidas: " + errorMessage(e));
    }
    setLoadingMore(false);
  }

  const summaryBlocks = overall && [
    { title: "Winrate", value: `${overall.wr}%`, color: winrateColor(overall.wr, accent), sub: `${overall.wins}V ${overall.losses}D` },
    { title: "KDA Prom.", value: overall.kda, color: kdaColor(overall.kda, colors.text), sub: `${overall.avgKills}/${overall.avgDeaths}/${overall.avgAssists}` },
    ...(topChamp ? [{
      title: "Más jugado",
      sub: `${topChamp.games} partidas`,
      node: <Image source={{ uri: championIcon(topChamp.name) }} style={styles.topChampImg} />,
    }] : []),
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <ProfileHeader
        game={GAME}
        avatar={<ProfileIcon iconId={summoner.profileIconId} level={summoner.summonerLevel} game={GAME} />}
        name={account.gameName}
        tag={account.tagLine}
        badge={soloQ ? `${soloQ.tier} ${soloQ.rank} · ${soloQ.leaguePoints} LP` : null}
        action={isFav ? "⭐" : "☆"}
        onAction={toggleFavorite}
      />

      {streak && (
        <View style={[styles.streak, {
          backgroundColor: streak.isWin ? colors.winBgStrong : colors.lossBgStrong,
          borderColor:     streak.isWin ? colors.win : colors.loss,
        }]}>
          <Text style={[styles.streakText, { color: streak.isWin ? colors.win : colors.loss }]}>
            {streak.isWin ? "🔥" : "❄️"} Racha de {streak.count} {streak.isWin ? "victorias" : "derrotas"}
          </Text>
        </View>
      )}

      {overall && (
        <OverallCard
          label={`Resumen — últimas ${overall.games} partidas`}
          blocks={summaryBlocks}
          bar={{ value: overall.wr, color: winrateColor(overall.wr, accent) }}
        />
      )}

      {(soloQ || flex) && (
        <View style={styles.rankedRow}>
          {soloQ && <RankedCard entry={soloQ} label="Solo / Dúo" game={GAME} />}
          {flex  && <RankedCard entry={flex}  label="Flex 5v5"   game={GAME} />}
        </View>
      )}

      <SegmentedTabs tabs={TABS} value={activeTab} onChange={setActiveTab} game={GAME} />

      {activeTab === "campeones" && (
        <Card>
          <SectionLabel>Más jugados (últimas {matches?.length} partidas)</SectionLabel>
          {champStats.map(c => <ChampionStatsRow key={c.name} champ={c} game={GAME} />)}
        </Card>
      )}

      {activeTab === "partidas" && (
        <>
          <View style={styles.filters}>
            <View style={styles.filterRow}>
              {RESULT_FILTERS.map(f => (
                <Chip key={f.key} label={f.label} active={filterWin === f.key} game={GAME} onPress={() => setFilterWin(f.key)} />
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label="Todos" active={filterChamp === "all"} game={GAME} onPress={() => setFilterChamp("all")} />
              {uniqueChamps.map(c => (
                <Chip
                  key={c}
                  label={c}
                  image={championIcon(c)}
                  active={filterChamp === c}
                  game={GAME}
                  onPress={() => setFilterChamp(filterChamp === c ? "all" : c)}
                />
              ))}
            </ScrollView>
          </View>

          <SectionLabel>{filteredMatches.length} partidas</SectionLabel>

          {filteredMatches.map(m => (
            <View key={m.metadata.matchId}>
              <MatchRow
                match={m}
                myPuuid={account.puuid}
                expanded={activeMatch === m.metadata.matchId}
                onPress={() => setActiveMatch(activeMatch === m.metadata.matchId ? null : m.metadata.matchId)}
              />
              {activeMatch === m.metadata.matchId && <MatchDetail match={m} myPuuid={account.puuid} />}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.loadMoreBtn, { borderColor: withAlpha(accent, 0.4) }, (loadingMore || !hasMore) && styles.disabled]}
            onPress={loadMore}
            disabled={loadingMore || !hasMore}
          >
            <Text style={[styles.loadMoreText, { color: accent }]}>
              {loadingMore ? "Cargando..." : hasMore ? "⬇ Cargar más partidas" : "No hay más partidas"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  content:      { padding: spacing.lg, paddingBottom: spacing.xxxl },
  topChampImg:  { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  rankedRow:    { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  streak:       {
    padding: spacing.md, borderRadius: radii.md, borderWidth: sizes.hairline,
    marginBottom: spacing.lg, alignItems: "center",
  },
  streakText:   { ...type.bodyStrong },
  filters:      { marginBottom: spacing.md },
  filterRow:    { flexDirection: "row", marginBottom: spacing.md },
  loadMoreBtn:  {
    marginTop: spacing.md, padding: spacing.lg,
    backgroundColor: colors.surface, borderWidth: sizes.hairline,
    borderRadius: radii.md, alignItems: "center",
  },
  loadMoreText: { ...type.bodyStrong },
  disabled:     { opacity: 0.5 },
});
