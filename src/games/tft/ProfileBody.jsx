import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import RankedCard from "../../components/RankedCard";
import Reveal from "../../components/Reveal";
import { Card, SectionLabel, OverallCard, LoadMoreButton, Notice } from "../../components/ui";
import TftMatchRow from "./components/MatchRow";
import { getMoreMatches } from "./api";
import { getTftStats } from "./utils";
import { errorMessage } from "../../utils/format";
import { colors, spacing, type, winrateColor, useAccent } from "../../theme";

const GAME = "tft";

// Hyper Roll no usa tier/rango sino una escala de colores
const TURBO_COLORS = {
  GRAY: colors.textMuted, GREEN: colors.win, BLUE: colors.info,
  PURPLE: colors.cost[4], ORANGE: colors.cost[5],
};
const TURBO_NAMES = { GRAY: "Gris", GREEN: "Verde", BLUE: "Azul", PURPLE: "Morado", ORANGE: "Naranja" };

function TurboCard({ entry }) {
  const color = TURBO_COLORS[entry.ratedTier] || colors.textMuted;
  return (
    <Card accent={color}>
      <SectionLabel>Hyper Roll</SectionLabel>
      <Text style={[styles.turboTier, { color }]}>{TURBO_NAMES[entry.ratedTier] || entry.ratedTier}</Text>
      <Text style={styles.turboMeta}>{entry.ratedRating} puntos · {entry.wins} partidas</Text>
    </Card>
  );
}

// Contenido del perfil de Teamfight Tactics (cabecera, favoritos y refresco los pone el perfil genérico)
export default function TftProfileBody({ data, setData, setError }) {
  const accent = useAccent(GAME);
  const [activeMatch, setActiveMatch] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { account, ranked, rankedError, matches, hasMore, nextStart, region } = data;
  const rankedEntry = ranked?.find(r => r.queueType === "RANKED_TFT");
  const doubleUp    = ranked?.find(r => r.queueType === "RANKED_TFT_DOUBLE_UP");
  const turbo       = ranked?.find(r => r.queueType === "RANKED_TFT_TURBO");
  const stats       = getTftStats(matches, account.puuid);

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
      setError("No se pudieron cargar más partidas: " + errorMessage(e));
    }
    setLoadingMore(false);
  }

  return (
    <>
      <Reveal order={1}>
        {rankedError && <Notice tone="warn">No se pudo cargar el rango: {rankedError}</Notice>}
        {(rankedEntry || doubleUp) && (
          <View style={styles.rankedRow}>
            {rankedEntry && <RankedCard entry={rankedEntry} label="Ranked" game={GAME} />}
            {doubleUp    && <RankedCard entry={doubleUp}    label="Double Up" game={GAME} />}
          </View>
        )}
        {turbo && <TurboCard entry={turbo} />}
      </Reveal>

      {stats && (
        <Reveal order={2}>
          <OverallCard
            label={`Resumen — últimas ${stats.games} partidas`}
            blocks={[
              { title: "Posición", value: stats.avg, sub: "promedio", color: parseFloat(stats.avg) <= 4 ? colors.win : colors.loss },
              { title: "Top 4", value: `${stats.top4}%`, sub: "de las partidas", color: winrateColor(stats.top4, accent) },
              { title: "Victorias", value: stats.wins, sub: "1er lugar", color: colors.placement.first },
            ]}
          />
        </Reveal>
      )}

      <Reveal order={3}>
        <SectionLabel>{matches?.length || 0} partidas</SectionLabel>
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
            <LoadMoreButton game={GAME} loading={loadingMore} hasMore={hasMore} onPress={loadMore} />
          </>
        ) : (
          <Text style={styles.empty}>No se encontraron partidas de TFT</Text>
        )}
      </Reveal>
    </>
  );
}

const styles = StyleSheet.create({
  rankedRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  turboTier: { ...type.title },
  turboMeta: { ...type.small, color: colors.textSecondary, marginTop: spacing.xs },
  empty:     { ...type.body, color: colors.textFaint, textAlign: "center", marginTop: spacing.xl },
});
