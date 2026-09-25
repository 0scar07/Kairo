import React, { useState } from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import RankedCard from "../../components/RankedCard";
import Reveal from "../../components/Reveal";
import {
  Card, SectionLabel, SegmentedTabs, Chip, OverallCard, LoadMoreButton, Notice,
  Expandable, ResultsStrip, EmptyState, RowSkeleton,
} from "../../components/ui";
import MatchRow from "./components/MatchRow";
import MatchDetail from "./components/MatchDetail";
import ChampionStatsRow from "./components/ChampionStatsRow";
import MineExtras from "./MineExtras";
import MasteryCard from "./components/MasteryCard";
import { getMoreMatches } from "./api";
import { findMe, getChampionStats, getOverallStats, getStreak } from "./utils";
import { championIcon, championLabel } from "../../api/ddragon";
import Icon from "../../components/Icon";
import LiveBanner from "./components/LiveBanner";
import { errorMessage } from "../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, kdaColor, winrateColor, useAccent } from "../../theme";

const GAME = "lol";
const STRIP_MAX = 20;

// Contenido del perfil de League of Legends (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function LolProfileBody({ data, setData, setError, mine }) {
  const t = useT();
  const accent = useAccent(GAME);
  const tabs = [
    { key: "partidas",  label: t("lol.tabMatches").toUpperCase(), icon: "gamepad" },
    { key: "campeones", label: t("lol.tabChampions").toUpperCase(), icon: "trophy" },
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
  const streak     = getStreak(matches || [], account.puuid);
  const topChamp   = champStats[0];

  const recent = (matches || []).map(m => findMe(m, account.puuid)).filter(Boolean).slice(0, STRIP_MAX);
  const stripItems = recent.map(p => ({ color: p.win ? colors.win : colors.loss }));

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

  const summaryBlocks = overall && [
    { title: t("stats.winrate"), value: `${overall.wr}%`, color: winrateColor(overall.wr, accent), sub: `${overall.wins}V ${overall.losses}D` },
    { title: t("stats.avgKda"), value: overall.kda, color: kdaColor(overall.kda, colors.text), sub: `${overall.avgKills}/${overall.avgDeaths}/${overall.avgAssists}` },
    ...(topChamp ? [{
      title: t("stats.mostPlayed"),
      sub: t("common.games", { count: topChamp.games }),
      node: <Image source={{ uri: championIcon(topChamp.name) }} style={styles.topChampImg} />,
    }] : []),
  ];

  return (
    <>
      <LiveBanner puuid={account.puuid} region={region} />

      <Reveal order={1}>
        {rankedError
          ? <Notice tone="warn">{t("ranked.error", { error: rankedError })}</Notice>
          : (
            <View style={styles.rankedRow}>
              <RankedCard entry={soloQ} label={t("ranked.solo")} game={GAME} />
              <RankedCard entry={flex}  label={t("ranked.flex")} game={GAME} />
            </View>
          )}
      </Reveal>

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
          <OverallCard
            label={t("stats.summaryLast", { count: overall.games })}
            blocks={summaryBlocks}
            bar={{ value: overall.wr, color: winrateColor(overall.wr, accent) }}
          />
          <ResultsStrip
            label={t("results.recent")}
            summary={t("results.summary", { wins: recent.filter(p => p.win).length, losses: recent.filter(p => !p.win).length })}
            items={stripItems}
          />
        </Reveal>
      )}

      {mine && <MineExtras data={data} />}

      <Reveal order={4}>
        <SegmentedTabs tabs={tabs} value={activeTab} onChange={setActiveTab} game={GAME} />
      </Reveal>

      <Reveal order={5}>
        {activeTab === "campeones" && (
          champStats.length ? (
            <Card>
              <SectionLabel>{t("lol.mostPlayed", { count: matches?.length })}</SectionLabel>
              {champStats.map((c, i) => (
                <ChampionStatsRow key={c.name} champ={c} game={GAME} rank={mine ? i : undefined} />
              ))}
            </Card>
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

              {filteredMatches.map(m => {
                const open = activeMatch === m.metadata.matchId;
                return (
                  <View key={m.metadata.matchId}>
                    <MatchRow match={m} myPuuid={account.puuid} expanded={open} onPress={() => setActiveMatch(open ? null : m.metadata.matchId)} />
                    <Expandable open={open}><MatchDetail match={m} myPuuid={account.puuid} /></Expandable>
                  </View>
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
  topChampImg:  { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  rankedRow:    { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  streak:       {
    padding: spacing.md, borderRadius: radii.md, borderWidth: sizes.hairline,
    marginBottom: spacing.lg, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm,
  },
  streakText:   { ...type.bodyStrong },
  filters:      { marginBottom: spacing.md },
  filterRow:    { flexDirection: "row", marginBottom: spacing.md },
});
