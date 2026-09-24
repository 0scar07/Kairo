import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import RankedCard from "../../components/RankedCard";
import Reveal from "../../components/Reveal";
import {
  Card, SectionLabel, SegmentedTabs, Chip, OverallCard, LoadMoreButton, Notice,
} from "../../components/ui";
import MatchRow from "./components/MatchRow";
import MatchDetail from "./components/MatchDetail";
import ChampionStatsRow from "./components/ChampionStatsRow";
import MineExtras from "./MineExtras";
import { getMoreMatches } from "./api";
import { findMe, getChampionStats, getOverallStats, getStreak } from "./utils";
import { championIcon } from "../../api/ddragon";
import { errorMessage } from "../../utils/format";
import { colors, radii, sizes, spacing, type, kdaColor, winrateColor, useAccent } from "../../theme";

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

// Contenido del perfil de League of Legends (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function LolProfileBody({ data, setData, setError, mine }) {
  const accent = useAccent(GAME);
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeTab,   setActiveTab]   = useState("partidas");
  const [filterWin,   setFilterWin]   = useState("all");
  const [filterChamp, setFilterChamp] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);

  const { account, ranked, rankedError, matches, hasMore, nextStart, region } = data;
  const soloQ      = ranked?.find(r => r.queueType === "RANKED_SOLO_5x5");
  const flex       = ranked?.find(r => r.queueType === "RANKED_FLEX_SR");
  const champStats = getChampionStats(matches || [], account.puuid).slice(0, 5);
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
    <>
      {streak && (
        <Reveal order={1}>
          <View style={[styles.streak, {
            backgroundColor: streak.isWin ? colors.winBgStrong : colors.lossBgStrong,
            borderColor:     streak.isWin ? colors.win : colors.loss,
          }]}>
            <Text style={[styles.streakText, { color: streak.isWin ? colors.win : colors.loss }]}>
              {streak.isWin ? "🔥" : "❄️"} Racha de {streak.count} {streak.isWin ? "victorias" : "derrotas"}
            </Text>
          </View>
        </Reveal>
      )}

      {overall && (
        <Reveal order={2}>
          <OverallCard
            label={`Resumen — últimas ${overall.games} partidas`}
            blocks={summaryBlocks}
            bar={{ value: overall.wr, color: winrateColor(overall.wr, accent) }}
          />
        </Reveal>
      )}

      <Reveal order={3}>
        {rankedError && <Notice tone="warn">No se pudo cargar el rango: {rankedError}</Notice>}
        {(soloQ || flex) && (
          <View style={styles.rankedRow}>
            {soloQ && <RankedCard entry={soloQ} label="Solo / Dúo" game={GAME} />}
            {flex  && <RankedCard entry={flex}  label="Flex 5v5"   game={GAME} />}
          </View>
        )}
      </Reveal>

      {mine && <MineExtras data={data} />}

      <Reveal order={4}>
        <SegmentedTabs tabs={TABS} value={activeTab} onChange={setActiveTab} game={GAME} />
      </Reveal>

      <Reveal order={5}>
        {activeTab === "campeones" && (
          <Card>
            <SectionLabel>Más jugados (últimas {matches?.length} partidas)</SectionLabel>
            {champStats.map((c, i) => (
              <ChampionStatsRow key={c.name} champ={c} game={GAME} rank={mine ? i : undefined} />
            ))}
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

            <LoadMoreButton game={GAME} loading={loadingMore} hasMore={hasMore} onPress={loadMore} />
          </>
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
    marginBottom: spacing.lg, alignItems: "center",
  },
  streakText:   { ...type.bodyStrong },
  filters:      { marginBottom: spacing.md },
  filterRow:    { flexDirection: "row", marginBottom: spacing.md },
});
