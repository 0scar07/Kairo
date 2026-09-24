import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Reveal from "../../components/Reveal";
import { Card, SectionLabel, StatGrid, ResultsStrip, BattleRow, EmptyState, Chip } from "../../components/ui";
import { brawlerIcon } from "./assets";
import { battleView, summarize } from "./utils";
import { formatNumber, timeSince } from "../../utils/format";
import { tagOf, titleCase } from "../../utils/supercell";
import { colors, radii, sizes, spacing, type, useAccent } from "../../theme";

const GAME = "brawlstars";
const BRAWLERS_PREVIEW = 5;
const STRIP_MAX = 20;

function BrawlerRow({ brawler }) {
  const accent = useAccent(GAME);
  return (
    <View style={styles.brawler}>
      <Image source={{ uri: brawlerIcon(brawler.id) }} style={[styles.brawlerImg, { borderColor: accent }]} />
      <View style={styles.brawlerInfo}>
        <Text style={styles.brawlerName} numberOfLines={1}>{titleCase(brawler.name)}</Text>
        <Text style={styles.brawlerSub}>Poder {brawler.power} · Rango {brawler.rank}</Text>
      </View>
      <View style={styles.brawlerTrophies}>
        <Text style={[styles.trophies, { color: accent }]}>{formatNumber(brawler.trophies)}</Text>
        <Text style={styles.brawlerSub}>máx. {formatNumber(brawler.highestTrophies)}</Text>
      </View>
    </View>
  );
}

// Contenido del perfil de Brawl Stars (la cabecera, favoritos y refresco los pone el perfil genérico)
export default function BrawlStarsProfileBody({ data }) {
  const accent = useAccent(GAME);
  const [showAll, setShowAll] = useState(false);
  const { player, battles } = data;
  const myTag = tagOf(player.tag);

  const brawlers = [...(player.brawlers || [])].sort((a, b) => b.trophies - a.trophies);
  const shownBrawlers = showAll ? brawlers : brawlers.slice(0, BRAWLERS_PREVIEW);
  const views = (battles || []).map(item => battleView(item, myTag));
  const { wins, losses } = summarize(views);

  const stripItems = views.slice(0, STRIP_MAX)
    .filter(v => v.win !== null)
    .map(v => ({ color: v.win ? colors.win : colors.loss }));

  return (
    <>
      <Reveal order={1}>
        <StatGrid
          label="Resumen"
          icon="trophy"
          items={[
            { label: "Trofeos", value: formatNumber(player.trophies), color: accent },
            { label: "Récord", value: formatNumber(player.highestTrophies) },
            { label: "Nivel", value: player.expLevel },
          ]}
        />
      </Reveal>

      <Reveal order={2}>
        <StatGrid
          label="Victorias"
          icon="award"
          items={[
            { label: "3 vs 3", value: formatNumber(player["3vs3Victories"]) },
            { label: "Solo", value: formatNumber(player.soloVictories) },
            { label: "Dúo", value: formatNumber(player.duoVictories) },
          ]}
        />
      </Reveal>

      {brawlers.length > 0 && (
        <Reveal order={3}>
          <Card>
            <SectionLabel icon="target">Brawlers ({brawlers.length})</SectionLabel>
            {shownBrawlers.map(b => <BrawlerRow key={b.id} brawler={b} />)}
            {brawlers.length > BRAWLERS_PREVIEW && (
              <Chip
                label={showAll ? "Ver menos" : `Ver todos (${brawlers.length})`}
                active
                game={GAME}
                onPress={() => setShowAll(v => !v)}
              />
            )}
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
                image={v.brawler ? brawlerIcon(v.brawler.id) : null}
                result={v.result.label}
                title={v.brawlerName}
                subtitle={[v.mode, v.map].filter(Boolean).join(" · ")}
                value={v.trophyChange != null ? `${v.trophyChange > 0 ? "+" : ""}${v.trophyChange}` : null}
                valueColor={v.trophyChange > 0 ? colors.win : v.trophyChange < 0 ? colors.loss : colors.textMuted}
                valueSub={timeSince(v.time)}
              />
            ))}
          </>
        )}
      </Reveal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel:    { marginTop: spacing.sm },
  brawler:         { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  brawlerImg:      {
    width: sizes.placement, height: sizes.placement, borderRadius: radii.md,
    borderWidth: sizes.hairline, backgroundColor: colors.surfaceHigh,
  },
  brawlerInfo:     { flex: 1, minWidth: 0 },
  brawlerName:     { ...type.bodyStrong, color: colors.text },
  brawlerSub:      { ...type.caption, color: colors.textMuted },
  brawlerTrophies: { alignItems: "flex-end" },
  trophies:        { ...type.stat },
});
