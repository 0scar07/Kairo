import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Reveal from "../../components/Reveal";
import { Card, SectionLabel, StatGrid, ResultsStrip, BattleRow, Notice, ProgressBar, Chip } from "../../components/ui";
import DotaMedal from "./DotaMedal";
import { heroIcon, heroName } from "./heroes";
import { modeLabel, medalOf, rankLabel } from "./utils";
import { formatDuration, formatNumber, timeSince, winrate } from "../../utils/format";
import { useT } from "../../i18n/I18nProvider";
import { colors, radii, sizes, spacing, type, winrateColor, useAccent } from "../../theme";

const GAME = "dota2";
const HEROES_PREVIEW = 5;
const STRIP_MAX = 20;

function HeroRow({ hero, accent }) {
  const t = useT();
  const wr = winrate(hero.wins, hero.games - hero.wins);
  const icon = heroIcon(hero.heroId);
  return (
    <View style={styles.hero}>
      {icon ? <Image source={{ uri: icon }} style={styles.heroImg} /> : <View style={styles.heroImg} />}
      <View style={styles.heroInfo}>
        <View style={styles.heroTop}>
          <Text style={styles.heroName} numberOfLines={1}>{heroName(hero.heroId)}</Text>
          <Text style={[styles.heroWr, { color: winrateColor(wr, accent) }]}>{wr}%</Text>
        </View>
        <Text style={styles.heroSub}>{t("common.games", { count: hero.games })}</Text>
        <ProgressBar value={wr} color={winrateColor(wr, accent)} height={sizes.barThin} />
      </View>
    </View>
  );
}

// Contenido del perfil de Dota 2 (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function DotaProfileBody({ data }) {
  const t = useT();
  const accent = useAccent(GAME);
  const [showAll, setShowAll] = useState(false);
  const { player } = data;
  const games = player.wins + player.losses;
  const recent = player.recent || [];
  const heroes = showAll ? player.heroes : player.heroes.slice(0, HEROES_PREVIEW);
  const wins = recent.filter(m => m.win).length;

  return (
    <>
      {games === 0 && recent.length === 0 && (
        <Reveal order={1}><Notice tone="warn" icon="alert">{t("dota.private")}</Notice></Reveal>
      )}

      <Reveal order={1}>
        <Card>
          <View style={styles.rank}>
            <DotaMedal rankTier={player.rankTier} size={sizes.iconHero - spacing.sm} />
            <View style={styles.rankInfo}>
              <SectionLabel style={styles.rankLabel}>{t("dota.rank")}</SectionLabel>
              <Text style={[styles.rankText, { color: accent }]}>{rankLabel(player.rankTier, player.leaderboardRank)}</Text>
              {medalOf(player.rankTier)?.medal === 8 && player.leaderboardRank ? (
                <Text style={styles.rankSub}>{t("dota.leaderboard", { pos: formatNumber(player.leaderboardRank) })}</Text>
              ) : null}
            </View>
          </View>
        </Card>
      </Reveal>

      {games > 0 && (
        <Reveal order={2}>
          <StatGrid
            label={t("dota.record")}
            icon="barChart"
            items={[
              { label: t("results.wins"), value: formatNumber(player.wins), color: colors.win },
              { label: t("results.losses"), value: formatNumber(player.losses), color: colors.loss },
              { label: t("stats.winrate"), value: `${winrate(player.wins, player.losses)}%`, color: winrateColor(winrate(player.wins, player.losses), accent) },
            ]}
          />
        </Reveal>
      )}

      {player.heroes.length > 0 && (
        <Reveal order={3}>
          <Card>
            <SectionLabel icon="target">{t("dota.heroes")}</SectionLabel>
            {heroes.map(h => <HeroRow key={h.heroId} hero={h} accent={accent} />)}
            {player.heroes.length > HEROES_PREVIEW && (
              <Chip
                label={showAll ? t("sc.seeLess") : t("sc.seeAll", { count: player.heroes.length })}
                active game={GAME} onPress={() => setShowAll(v => !v)}
              />
            )}
          </Card>
        </Reveal>
      )}

      {recent.length > 0 && (
        <Reveal order={4}>
          <ResultsStrip
            label={t("results.recent")}
            summary={t("results.summary", { wins, losses: recent.length - wins })}
            items={recent.slice(0, STRIP_MAX).map(m => ({ color: m.win ? colors.win : colors.loss }))}
          />
          <SectionLabel style={styles.sectionLabel}>{t("sc.lastBattles", { count: recent.length })}</SectionLabel>
          {recent.map(m => (
            <BattleRow
              key={m.matchId}
              color={m.win ? colors.win : colors.loss}
              image={heroIcon(m.heroId)}
              result={m.win ? t("results.victory") : t("results.defeat")}
              title={heroName(m.heroId)}
              subtitle={`${modeLabel(m.gameMode, m.lobbyType)} · ${formatDuration(m.duration)}`}
              value={`${m.kills}/${m.deaths}/${m.assists}`}
              valueSub={timeSince(m.startTime * 1000)}
            />
          ))}
        </Reveal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.sm },
  rank:         { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  rankInfo:     { flex: 1 },
  rankLabel:    { marginBottom: spacing.xs },
  rankText:     { ...type.statLarge },
  rankSub:      { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  hero:         { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  heroImg:      { width: sizes.placement, height: sizes.placement, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  heroInfo:     { flex: 1, minWidth: 0, gap: spacing.xxs },
  heroTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  heroName:     { ...type.bodyStrong, color: colors.text, flex: 1 },
  heroWr:       { ...type.smallStrong },
  heroSub:      { ...type.caption, color: colors.textMuted },
});
