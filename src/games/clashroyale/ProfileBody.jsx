import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Reveal from "../../components/Reveal";
import { Card, SectionLabel, StatGrid, ResultsStrip, BattleRow, EmptyState } from "../../components/ui";
import { averageElixir, battleView, cardIcon, displayLevel } from "./utils";
import { formatNumber, timeSince, winrate } from "../../utils/format";
import { colors, radii, sizes, spacing, type, useAccent } from "../../theme";

const GAME = "clashroyale";
const STRIP_MAX = 20;

function DeckCard({ card }) {
  return (
    <View style={styles.card}>
      {cardIcon(card)
        ? <Image source={{ uri: cardIcon(card) }} style={styles.cardImg} resizeMode="contain" />
        : <View style={[styles.cardImg, styles.cardEmpty]} />}
      <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
      <Text style={styles.cardLevel}>Nv {displayLevel(card)}</Text>
    </View>
  );
}

// Contenido del perfil de Clash Royale (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function ClashRoyaleProfileBody({ data }) {
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
          label="Resumen"
          icon="trophy"
          items={[
            { label: "Trofeos", value: formatNumber(player.trophies), color: accent },
            { label: "Récord", value: formatNumber(player.bestTrophies) },
            { label: "Nivel", value: player.expLevel },
          ]}
        />
      </Reveal>

      <Reveal order={2}>
        <StatGrid
          label="Historial"
          icon="barChart"
          items={[
            { label: "Victorias", value: formatNumber(player.wins), color: colors.win },
            { label: "Derrotas", value: formatNumber(player.losses), color: colors.loss },
            { label: "Winrate", value: `${winrate(player.wins, player.losses)}%` },
            { label: "Batallas", value: formatNumber(player.battleCount) },
            { label: "3 coronas", value: formatNumber(player.threeCrownWins) },
          ]}
        />
      </Reveal>

      {pathOfLegend?.leagueNumber ? (
        <Reveal order={2}>
          <StatGrid
            label="Senda de leyendas"
            icon="crown"
            items={[
              { label: "Liga", value: pathOfLegend.leagueNumber, color: accent },
              ...(pathOfLegend.trophies != null ? [{ label: "Puntos", value: formatNumber(pathOfLegend.trophies) }] : []),
              ...(pathOfLegend.rank ? [{ label: "Ranking", value: `#${formatNumber(pathOfLegend.rank)}` }] : []),
            ]}
          />
        </Reveal>
      ) : null}

      {deck.length > 0 && (
        <Reveal order={3}>
          <Card>
            <View style={styles.deckHeader}>
              <SectionLabel style={styles.deckLabel} icon="shield">Mazo actual</SectionLabel>
              {elixir ? <Text style={[styles.elixir, { color: accent }]}>{elixir} elixir</Text> : null}
            </View>
            <View style={styles.deck}>
              {deck.map(c => <DeckCard key={c.id} card={c} />)}
            </View>
          </Card>
        </Reveal>
      )}

      <Reveal order={4}>
        {views.length === 0 ? (
          <EmptyState compact icon="gamepad" title="Sin batallas recientes" text="Cuando juegue verás aquí sus últimas partidas." />
        ) : (
          <>
            <ResultsStrip label="Resultados recientes" summary={`${wins}V · ${losses}D`} items={stripItems} />
            <SectionLabel style={styles.sectionLabel}>Últimas {views.length} batallas</SectionLabel>
            {views.map((v, i) => (
              <BattleRow
                key={`${battles[i].battleTime}-${i}`}
                color={v.result.color}
                result={v.result.label}
                title={`vs ${v.rivalName}`}
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
