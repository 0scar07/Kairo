import React from "react";
import { useT } from "../../i18n/I18nProvider";
import { View, Text, Image, StyleSheet } from "react-native";
import Reveal from "../../components/Reveal";
import { Card, SectionLabel, StatGrid, ResultsStrip, BattleRow, EmptyState } from "../../components/ui";
import { averageElixir, battleView, cardIcon, displayLevel } from "./utils";
import { formatNumber, timeSince, winrate } from "../../utils/format";
import { colors, radii, sizes, spacing, type, useAccent } from "../../theme";

const GAME = "clashroyale";
const STRIP_MAX = 20;

function DeckCard({ card }) {
  const t = useT();
  return (
    <View style={styles.card}>
      {cardIcon(card)
        ? <Image source={{ uri: cardIcon(card) }} style={styles.cardImg} resizeMode="contain" />
        : <View style={[styles.cardImg, styles.cardEmpty]} />}
      <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
      <Text style={styles.cardLevel}>{t("common.level", { level: displayLevel(card) })}</Text>
    </View>
  );
}

// Contenido del perfil de Clash Royale (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function ClashRoyaleProfileBody({ data }) {
  const t = useT();
  const accent = useAccent(GAME);
  const { player, battles } = data;

  const deck = player.currentDeck || [];
  const elixir = averageElixir(deck);
  const views = (battles || []).map(battleView);
  const wins = views.filter(v => v.win === true).length;
  const losses = views.filter(v => v.win === false).length;
  const stripItems = views.slice(0, STRIP_MAX).filter(v => v.win !== null).map(v => ({ color: v.win ? colors.win : colors.loss }));
  const pathOfLegend = player.currentPathOfLegendSeasonResult;

  return (
    <>
      <Reveal order={1}>
        <StatGrid
          label={t("sc.summary")}
          icon="trophy"
          items={[
            { label: t("sc.trophies"), value: formatNumber(player.trophies), color: accent },
            { label: t("sc.record"), value: formatNumber(player.bestTrophies) },
            { label: t("sc.level"), value: player.expLevel },
          ]}
        />
      </Reveal>

      <Reveal order={2}>
        <StatGrid
          label={t("cr.history")}
          icon="barChart"
          items={[
            { label: t("results.wins"), value: formatNumber(player.wins), color: colors.win },
            { label: t("results.losses"), value: formatNumber(player.losses), color: colors.loss },
            { label: t("stats.winrate"), value: `${winrate(player.wins, player.losses)}%` },
            { label: t("cr.battles"), value: formatNumber(player.battleCount) },
            { label: t("cr.threeCrowns"), value: formatNumber(player.threeCrownWins) },
          ]}
        />
      </Reveal>

      {pathOfLegend?.leagueNumber ? (
        <Reveal order={2}>
          <StatGrid
            label={t("cr.pathOfLegend")}
            icon="crown"
            items={[
              { label: t("cr.league"), value: pathOfLegend.leagueNumber, color: accent },
              ...(pathOfLegend.trophies != null ? [{ label: t("cr.points"), value: formatNumber(pathOfLegend.trophies) }] : []),
              ...(pathOfLegend.rank ? [{ label: t("cr.ranking"), value: `#${formatNumber(pathOfLegend.rank)}` }] : []),
            ]}
          />
        </Reveal>
      ) : null}

      {deck.length > 0 && (
        <Reveal order={3}>
          <Card>
            <View style={styles.deckHeader}>
              <SectionLabel style={styles.deckLabel} icon="shield">{t("cr.deck")}</SectionLabel>
              {elixir ? <Text style={[styles.elixir, { color: accent }]}>{t("cr.elixir", { n: elixir })}</Text> : null}
            </View>
            <View style={styles.deck}>
              {deck.map(c => <DeckCard key={c.id} card={c} />)}
            </View>
          </Card>
        </Reveal>
      )}

      <Reveal order={4}>
        {views.length === 0 ? (
          <EmptyState compact icon="gamepad" title={t("sc.noBattles")} text={t("sc.noBattlesText")} />
        ) : (
          <>
            <ResultsStrip label={t("results.recent")} summary={t("results.summary", { wins, losses })} items={stripItems} />
            <SectionLabel style={styles.sectionLabel}>{t("sc.lastBattles", { count: views.length })}</SectionLabel>
            {views.map((v, i) => (
              <BattleRow
                key={`${battles[i].battleTime}-${i}`}
                color={v.result.color}
                result={v.result.label}
                title={t("cr.vs", { name: v.rivalName })}
                subtitle={v.kind}
                value={v.score}
                valueSub={[v.trophyChange != null && v.trophyChange !== 0 ? `${v.trophyChange > 0 ? "+" : ""}${v.trophyChange}` : null, timeSince(v.time)].filter(Boolean).join(" · ")}
              />
            ))}
          </>
        )}
      </Reveal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.sm },
  deckHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  deckLabel:    { marginBottom: 0 },
  elixir:       { ...type.smallStrong },
  deck:         { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md },
  card:         { width: "25%", alignItems: "center", gap: spacing.xxs },
  cardImg:      { width: sizes.iconHero - spacing.xl, height: sizes.iconHero - spacing.xl },
  cardEmpty:    { backgroundColor: colors.surfaceHigh, borderRadius: radii.md },
  cardName:     { ...type.micro, color: colors.textSecondary },
  cardLevel:    { ...type.captionStrong, color: colors.text },
});
