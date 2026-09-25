import React, { useState } from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, StyleSheet } from "react-native";
import RankedCard from "../../components/RankedCard";
import Reveal from "../../components/Reveal";
import {
  Card, SectionLabel, OverallCard, LoadMoreButton, Notice, ResultsStrip, EmptyState, RowSkeleton,
} from "../../components/ui";
import TftMatchRow from "./components/MatchRow";
import { getMoreMatches } from "./api";
import { getTftStats, placementColor } from "./utils";
import { errorMessage } from "../../utils/format";
import { colors, spacing, type, winrateColor, useAccent } from "../../theme";

const GAME = "tft";
const STRIP_MAX = 20;

// Hyper Roll no usa tier/rango sino una escala de colores
const TURBO_COLORS = {
  GRAY: colors.textMuted, GREEN: colors.win, BLUE: colors.info,
  PURPLE: colors.cost[4], ORANGE: colors.cost[5],
};
const TURBO_NAMES = { GRAY: "tft.gray", GREEN: "tft.green", BLUE: "tft.blue", PURPLE: "tft.purple", ORANGE: "tft.orange" };

function TurboCard({ entry }) {
  const t = useT();
  const color = TURBO_COLORS[entry.ratedTier] || colors.textMuted;
  return (
    <Card accent={color}>
      <SectionLabel>{t("tft.hyperRoll")}</SectionLabel>
      <Text style={[styles.turboTier, { color }]}>{TURBO_NAMES[entry.ratedTier] ? t(TURBO_NAMES[entry.ratedTier]) : entry.ratedTier}</Text>
      <Text style={styles.turboMeta}>{t("tft.turboMeta", { points: entry.ratedRating, games: entry.wins })}</Text>
    </Card>
  );
}

// Contenido del perfil de Teamfight Tactics (cabecera, favoritos y refresco los pone el perfil genérico)
export default function TftProfileBody({ data, setData, setError }) {
  const t = useT();
  const accent = useAccent(GAME);
  const [activeMatch, setActiveMatch] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { account, ranked, rankedError, matches, hasMore, nextStart, region } = data;
  const rankedEntry = ranked?.find(r => r.queueType === "RANKED_TFT");
  const doubleUp    = ranked?.find(r => r.queueType === "RANKED_TFT_DOUBLE_UP");
  const turbo       = ranked?.find(r => r.queueType === "RANKED_TFT_TURBO");
  const stats       = getTftStats(matches, account.puuid);

  const stripItems = (stats?.placements || []).slice(0, STRIP_MAX)
    .map(p => ({ color: placementColor(p), text: String(p) }));

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getMoreMatches(account.puuid, nextStart, region);
      setData(prev => {
        const known = new Set(prev.matches.map(m => m.metadata.match_id));
        const fresh = page.matches.filter(m => !known.has(m.metadata.match_id));
        return { ...prev, matches: [...prev.matches, ...fresh], hasMore: page.hasMore, nextStart: page.nextStart };
      });
    } catch (e) {
      setError(t("matches.moreError", { error: errorMessage(e) }));
    }
    setLoadingMore(false);
  }

  return (
    <>
      <Reveal order={1}>
        {rankedError
          ? <Notice tone="warn">{t("ranked.error", { error: rankedError })}</Notice>
          : (
            <>
              <View style={styles.rankedRow}>
                <RankedCard entry={rankedEntry} label={t("tft.ranked")} game={GAME} />
                <RankedCard entry={doubleUp}    label={t("tft.doubleUp")} game={GAME} />
              </View>
              {turbo && <TurboCard entry={turbo} />}
            </>
          )}
      </Reveal>

      {stats && (
        <Reveal order={2}>
          <OverallCard
            label={t("stats.summaryLast", { count: stats.games })}
            blocks={[
              { title: t("tft.position"), value: stats.avg, sub: t("tft.average"), color: parseFloat(stats.avg) <= 4 ? colors.win : colors.loss },
              { title: t("tft.top4"), value: `${stats.top4}%`, sub: t("tft.ofGames"), color: winrateColor(stats.top4, accent) },
              { title: t("results.wins"), value: stats.wins, sub: t("tft.first"), color: colors.placement.first },
            ]}
          />
          <ResultsStrip label={t("tft.recentPlacements")} summary={t("tft.top4Summary", { pct: stats.top4 })} items={stripItems} />
        </Reveal>
      )}

      <Reveal order={3}>
        <SectionLabel>{t("common.games", { count: matches?.length || 0 })}</SectionLabel>
        {matches?.length > 0 ? (
          <>
            {matches.map(m => (
              <TftMatchRow
                key={m.metadata.match_id}
                match={m}
                puuid={account.puuid}
                expanded={activeMatch === m.metadata.match_id}
                onPress={() => setActiveMatch(activeMatch === m.metadata.match_id ? null : m.metadata.match_id)}
              />
            ))}
            {loadingMore && <><RowSkeleton /><RowSkeleton /></>}
            <LoadMoreButton game={GAME} loading={loadingMore} hasMore={hasMore} onPress={loadMore} />
          </>
        ) : (
          <EmptyState icon="gamepad" title={t("tft.emptyTitle")} text={t("tft.emptyText")} />
        )}
      </Reveal>
    </>
  );
}

const styles = StyleSheet.create({
  rankedRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  turboTier: { ...type.title },
  turboMeta: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs },
});
