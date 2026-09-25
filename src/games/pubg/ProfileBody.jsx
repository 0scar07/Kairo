import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import Reveal from "../../components/Reveal";
import { SectionLabel, StatGrid, Chip, BattleRow, EmptyState } from "../../components/ui";
import { MODE_ORDER, derived, mapName, modeLabel } from "./utils";
import { formatDuration, formatNumber, timeSince } from "../../utils/format";
import { useT } from "../../i18n/I18nProvider";
import { colors, spacing, useAccent } from "../../theme";

const GAME = "pubg";
const round1 = n => (Math.round(n * 10) / 10).toFixed(1);

// Contenido del perfil de PUBG (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function PubgProfileBody({ data }) {
  const t = useT();
  const accent = useAccent(GAME);
  const { player } = data;
  const modes = MODE_ORDER.filter(m => player.modes[m]);
  const [mode, setMode] = useState(modes[0]);
  const s = player.modes[mode];
  const d = s ? derived(s) : null;

  const rankedKey = MODE_ORDER.find(m => player.ranked?.[m]);
  const ranked = rankedKey ? player.ranked[rankedKey] : null;
  const rankedDeaths = ranked ? Math.max(1, ranked.deaths ?? ranked.roundsPlayed - ranked.wins) : 1;

  return (
    <>
      {modes.length > 0 ? (
        <>
          <Reveal order={1}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {modes.map(m => <Chip key={m} label={modeLabel(m)} active={mode === m} game={GAME} onPress={() => setMode(m)} />)}
            </ScrollView>
          </Reveal>
          <Reveal order={2}>
            <StatGrid
              label={modeLabel(mode)}
              icon="trophy"
              items={[
                { label: t("results.wins"), value: formatNumber(s.wins ?? 0), color: accent },
                { label: t("pubg.top10"), value: formatNumber(s.top10s ?? 0) },
                { label: t("stats.matches"), value: formatNumber(s.roundsPlayed ?? 0) },
                { label: t("fn.kills"), value: formatNumber(s.kills ?? 0) },
                { label: t("fn.kd"), value: round1(d.kd), color: colors.gold },
                { label: t("pubg.avgDamage"), value: formatNumber(Math.round(d.avgDamage)) },
                { label: t("pubg.headshots"), value: `${Math.round(d.headshotPct)}%` },
                { label: t("pubg.longestKill"), value: `${Math.round(s.longestKill ?? 0)} m` },
                { label: t("pubg.survival"), value: formatDuration(d.avgSurvival) },
              ]}
            />
          </Reveal>
        </>
      ) : (
        <Reveal order={1}><EmptyState compact icon="gamepad" title={t("pubg.noSeason")} text={t("pubg.noSeasonText")} /></Reveal>
      )}

      {ranked && (
        <Reveal order={3}>
          <StatGrid
            label={t("pubg.ranked", { mode: modeLabel(rankedKey) })}
            icon="crown"
            items={[
              { label: t("pubg.tier"), value: [ranked.tier, ranked.subTier].filter(Boolean).join(" ") || "—", color: accent },
              { label: t("pubg.points"), value: formatNumber(ranked.currentRankPoint ?? 0) },
              { label: t("fn.kd"), value: round1(ranked.kda ?? (ranked.kills || 0) / rankedDeaths) },
            ]}
          />
        </Reveal>
      )}

      {player.matches.length > 0 && (
        <Reveal order={4}>
          <SectionLabel style={styles.sectionLabel}>{t("sc.lastBattles", { count: player.matches.length })}</SectionLabel>
          {player.matches.map(m => {
            const place = m.stats.winPlace;
            const color = place === 1 ? colors.gold : place <= 10 ? colors.win : colors.textSecondary;
            return (
              <BattleRow
                key={m.id}
                color={color}
                result={t("pubg.place", { n: place })}
                title={mapName(m.map)}
                subtitle={`${modeLabel(m.mode)} · ${formatDuration(m.duration)}`}
                value={t("pubg.killsValue", { count: m.stats.kills ?? 0, n: m.stats.kills ?? 0 })}
                valueSub={`${Math.round(m.stats.damageDealt || 0)} dmg · ${timeSince(new Date(m.createdAt).getTime())}`}
              />
            );
          })}
        </Reveal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips:        { marginBottom: spacing.md },
  sectionLabel: { marginTop: spacing.sm },
});
