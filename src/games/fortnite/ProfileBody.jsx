import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import Reveal from "../../components/Reveal";
import { StatGrid, Chip, EmptyState } from "../../components/ui";
import { formatNumber } from "../../utils/format";
import { useT } from "../../i18n/I18nProvider";
import { colors, spacing, useAccent } from "../../theme";

const GAME = "fortnite";
const MODES = ["overall", "solo", "duo", "trio", "squad"];
const TOPS = ["top3", "top5", "top6", "top10", "top12", "top25"];
const round1 = n => (Math.round(n * 10) / 10).toFixed(1);

// Contenido del perfil de Fortnite (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function FortniteProfileBody({ data }) {
  const t = useT();
  const accent = useAccent(GAME);
  const { player } = data;
  const modes = MODES.filter(m => player.stats[m]);
  const [mode, setMode] = useState(modes[0]);
  const s = player.stats[mode];

  if (!s) return <EmptyState icon="gamepad" title={t("fn.noStats")} text={t("fn.noStatsText")} />;

  const main = [
    { label: t("results.wins"), value: formatNumber(s.wins ?? 0), color: accent },
    { label: t("stats.winrate"), value: `${round1(s.winRate ?? 0)}%` },
    { label: t("stats.matches"), value: formatNumber(s.matches ?? 0) },
    { label: t("fn.kills"), value: formatNumber(s.kills ?? 0) },
    { label: t("fn.kd"), value: round1(s.kd ?? 0), color: colors.gold },
    { label: t("fn.killsPerMatch"), value: round1(s.killsPerMatch ?? 0) },
  ];
  const tops = TOPS.filter(k => s[k] > 0).map(k => ({ label: t("fn.top", { n: k.slice(3) }), value: formatNumber(s[k]) }));

  return (
    <>
      <Reveal order={1}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {modes.map(m => <Chip key={m} label={t(`fn.mode.${m}`)} active={mode === m} game={GAME} onPress={() => setMode(m)} />)}
        </ScrollView>
      </Reveal>

      <Reveal order={2}><StatGrid label={t(`fn.mode.${mode}`)} icon="trophy" items={main} /></Reveal>

      {tops.length > 0 && <Reveal order={3}><StatGrid label={t("fn.placements")} icon="award" items={tops} /></Reveal>}

      {s.minutesPlayed > 0 && (
        <Reveal order={4}>
          <StatGrid
            label={t("fn.playtime")}
            icon="clock"
            items={[
              { label: t("fn.hours"), value: formatNumber(Math.round(s.minutesPlayed / 60)) },
              ...(s.playersOutlived ? [{ label: t("fn.outlived"), value: formatNumber(s.playersOutlived) }] : []),
              ...(s.score ? [{ label: t("fn.score"), value: formatNumber(s.score) }] : []),
            ]}
          />
        </Reveal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { marginBottom: spacing.md },
});
