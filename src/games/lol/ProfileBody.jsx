import React, { useEffect, useRef, useState } from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Reveal from "../../components/Reveal";
import {
  SectionLabel, SegmentedTabs, Chip, LoadMoreButton, Notice,
  Expandable, EmptyState, RowSkeleton,
} from "../../components/ui";
import MatchRow from "./components/MatchRow";
import MatchDetail from "./components/MatchDetail";
import ChampionTable from "./components/ChampionTable";
import QueueColumns from "./components/QueueColumns";
import Teammates from "./components/Teammates";
import RecentChampions from "./components/RecentChampions";
import SummaryRings from "./components/SummaryRings";
import MineExtras from "./MineExtras";
import WeeklyGoal from "./components/WeeklyGoal";
import WeekRecapCard from "./components/WeekRecapCard";
import MasteryCard from "./components/MasteryCard";
import { getMoreMatches, PROFILE_MATCHES } from "./api";
import { QUEUE_FLEX, QUEUE_SOLO, findMe, getBestChampions, getChampionStats, getOverallStats, getPaceStats, getStreak, getTeammates } from "./utils";
import { championIcon, championLabel } from "../../api/ddragon";
import Icon from "../../components/Icon";
import LiveBanner from "./components/LiveBanner";
import { errorMessage } from "../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type } from "../../theme";

const GAME = "lol";
const STRIP_MAX = 20;

// Contenido del perfil de League of Legends (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function LolProfileBody({ data, setData, setError, mine }) {
  const t = useT();
  const navigation = useNavigation();
  const tabs = [
    { key: "partidas",  label: t("lol.tabMatches"), icon: "gamepad" },
    { key: "campeones", label: t("lol.tabChampions"), icon: "trophy" },
  ];
  const resultFilters = [
    { key: "all",  label: t("filters.allMatches") },
    { key: "win",  label: t("results.wins") },
    { key: "loss", label: t("results.losses") },
  ];
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeTab,   setActiveTab]   = useState("partidas");
  const [filterWin,   setFilterWin]   = useState("all");
  const [filterChamp, setFilterChamp] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);

  const { account, ranked, rankedError, matches, hasMore, nextStart, region, mastery } = data;
  const soloQ      = ranked?.find(r => r.queueType === "RANKED_SOLO_5x5");
  const flex       = ranked?.find(r => r.queueType === "RANKED_FLEX_SR");
  const champStats = getChampionStats(matches || [], account.puuid).slice(0, 5);
  const overall    = getOverallStats(matches || [], account.puuid);
  const pace       = getPaceStats(matches || [], account.puuid);
  const loaded     = matches?.length || 0;
  const queues     = [
    { key: "solo", label: t("ranked.solo"), entry: soloQ, best: getBestChampions(matches, account.puuid, QUEUE_SOLO), games: loaded },
    { key: "flex", label: t("ranked.flex"), entry: flex,  best: getBestChampions(matches, account.puuid, QUEUE_FLEX), games: loaded },
  ];
  const streak     = getStreak(matches || [], account.puuid);
  const topChamp   = champStats[0];

  const recentGames = (matches || []).slice(0, STRIP_MAX)
    .map(m => { const me = findMe(m, account.puuid); return me ? { id: m.metadata.matchId, champion: me.championName, win: me.win } : null; })
    .filter(Boolean);

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

  // Completa en segundo plano hasta PROFILE_MATCHES partidas (el mejor winrate por cola necesita más muestra).
  // Un intento por cada lista nueva (al abrir y al refrescar); si falla, el perfil sigue con lo que ya tiene.
  const toppedUp = useRef(null);
  useEffect(() => {
    if (!hasMore || loaded === 0 || loaded >= PROFILE_MATCHES || toppedUp.current === matches) return;
    toppedUp.current = matches;
    let alive = true;
    getMoreMatches(account.puuid, nextStart, region, PROFILE_MATCHES - loaded)
      .then(page => {
        if (!alive) return;
        setData(prev => {
          const known = new Set(prev.matches.map(m => m.metadata.matchId));
          const fresh = page.matches.filter(m => !known.has(m.metadata.matchId));
          return { ...prev, matches: [...prev.matches, ...fresh], hasMore: page.hasMore, nextStart: page.nextStart };
        });
      })
      .catch(e => console.warn("No se pudieron completar las partidas del perfil:", e.message));
    return () => { alive = false; };
  }, [matches, hasMore]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getMoreMatches(account.puuid, nextStart, region);
      setData(prev => {
        const known = new Set(prev.matches.map(m => m.metadata.matchId));
        const fresh = page.matches.filter(m => !known.has(m.metadata.matchId));
        return { ...prev, matches: [...prev.matches, ...fresh], hasMore: page.hasMore, nextStart: page.nextStart };
      });
    } catch (e) {
      setError(t("matches.moreError", { error: errorMessage(e) }));
    }
    setLoadingMore(false);
  }

  return (
    <>
      <LiveBanner puuid={account.puuid} region={region} />

      <Reveal order={1}>
        {rankedError
          ? <Notice tone="warn">{t("ranked.error", { error: rankedError })}</Notice>
          : <QueueColumns
              queues={queues}
              onOpen={queue => navigation.navigate("RankHistory", { puuid: account.puuid, region, queue, name: `${account.gameName} #${account.tagLine}` })}
            />}
      </Reveal>

      {mine && (
        <Reveal order={2}>
          <WeeklyGoal data={data} />
          <WeekRecapCard data={data} />
        </Reveal>
      )}

      {mastery && (
        <Reveal order={2}>
          <MasteryCard mastery={mastery} />
        </Reveal>
      )}

      {streak && (
        <Reveal order={2}>
          <View style={[styles.streak, {
            backgroundColor: streak.isWin ? colors.winBgStrong : colors.lossBgStrong,
            borderColor:     streak.isWin ? colors.win : colors.loss,
          }]}>
            <Icon name={streak.isWin ? "flame" : "snowflake"} size={fontSizes.lg} color={streak.isWin ? colors.win : colors.loss} />
            <Text style={[styles.streakText, { color: streak.isWin ? colors.win : colors.loss }]}>
              {t(streak.isWin ? "lol.streakWins" : "lol.streakLosses", { count: streak.count })}
            </Text>
          </View>
        </Reveal>
      )}

      {overall && (
        <Reveal order={3}>
          <SummaryRings overall={overall} pace={pace} topChamp={topChamp} />
          <RecentChampions games={recentGames} onOpen={id => { setActiveTab("partidas"); setFilterWin("all"); setFilterChamp("all"); setActiveMatch(id); }} />
          <Teammates mates={getTeammates(matches, account.puuid)} games={matches?.length || 0} region={region} />
        </Reveal>
      )}

      {mine && <MineExtras data={data} />}

      <Reveal order={4}>
        <SegmentedTabs tabs={tabs} value={activeTab} onChange={setActiveTab} game={GAME} />
      </Reveal>

      <Reveal order={5}>
        {activeTab === "campeones" && (
          champStats.length ? (
            <>
              <SectionLabel>{t("lol.mostPlayed", { count: matches?.length })}</SectionLabel>
              <ChampionTable champs={champStats} ranked={mine} />
            </>
          ) : (
            <EmptyState icon="trophy" title={t("lol.noChampions")} text={t("lol.noChampionsText")} />
          )
        )}

        {activeTab === "partidas" && (
          !matches?.length ? (
            <EmptyState icon="gamepad" title={t("matches.emptyTitle")} text={t("matches.emptyText")} />
          ) : (
            <>
              <View style={styles.filters}>
                <View style={styles.filterRow}>
                  {resultFilters.map(f => (
                    <Chip key={f.key} label={f.label} active={filterWin === f.key} game={GAME} onPress={() => setFilterWin(f.key)} />
                  ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Chip label={t("filters.allChamps")} active={filterChamp === "all"} game={GAME} onPress={() => setFilterChamp("all")} />
                  {uniqueChamps.map(c => (
                    <Chip
                      key={c}
                      label={championLabel(c)}
                      image={championIcon(c)}
                      active={filterChamp === c}
                      game={GAME}
                      onPress={() => setFilterChamp(filterChamp === c ? "all" : c)}
                    />
                  ))}
                </ScrollView>
              </View>

              <SectionLabel>{t("common.games", { count: filteredMatches.length })}</SectionLabel>

              {filteredMatches.length === 0 && (
                <EmptyState
                  compact icon="search" title={t("filters.noResults")}
                  actionLabel={t("filters.clear")}
                  onAction={() => { setFilterWin("all"); setFilterChamp("all"); }}
                />
              )}

              {filteredMatches.map((m, i) => {
                const open = activeMatch === m.metadata.matchId;
                return (
                  // Cada fila entra en cascada (también las que llegan con "Cargar más")
                  <Reveal key={m.metadata.matchId} order={Math.min(i % 10, 8)} step={45} distance={12}>
                    <MatchRow match={m} myPuuid={account.puuid} expanded={open} onPress={() => setActiveMatch(open ? null : m.metadata.matchId)} />
                    <Expandable open={open}><MatchDetail match={m} myPuuid={account.puuid} /></Expandable>
                  </Reveal>
                );
              })}

              {loadingMore && <><RowSkeleton /><RowSkeleton /></>}
              <LoadMoreButton game={GAME} loading={loadingMore} hasMore={hasMore} onPress={loadMore} />
            </>
          )
        )}
      </Reveal>
    </>
  );
}

const styles = StyleSheet.create({
  streak:       {
    padding: spacing.md, borderRadius: radii.md, borderWidth: sizes.hairline,
    marginBottom: spacing.lg, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm,
  },
  streakText:   { ...type.bodyStrong },
  filters:      { marginBottom: spacing.md },
  filterRow:    { flexDirection: "row", marginBottom: spacing.md },
});
