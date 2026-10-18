import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import Icon from "../../../components/Icon";
import { useT } from "../../../i18n/I18nProvider";
import { CountUp } from "../../../components/ui";
import RankEmblem from "../../../components/RankEmblem";
import { championIcon, championLabel } from "../../../api/ddragon";
import { tierLabel, winrate } from "../../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, tracking, winrateColor, useAccent } from "../../../theme";

/**
 * Solo/Dúo y Flex en dos columnas separadas por una línea (sin tarjetas): rango, LP, récord y, debajo,
 * los campeones con mejor winrate de esa cola en las partidas cargadas.
 *  - queues: [{ key, label, entry, best: [champStats], games }]
 *  - onOpen(key): opcional; tocar una columna abre su progreso de LP (la columna lleva una flechita)
 */
export default function QueueColumns({ queues, onOpen }) {
  const t = useT();
  return (
    <View style={styles.wrap}>
      {queues.map(({ key, ...q }, i) => (
        onOpen ? (
          <Pressable
            key={key}
            onPress={() => onOpen(key)}
            style={({ pressed }) => [styles.col, i > 0 && styles.colRight, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityHint={t("lpHistory.open")}
          >
            <Queue {...q} openable />
          </Pressable>
        ) : (
          <View key={key} style={[styles.col, i > 0 && styles.colRight]}>
            <Queue {...q} />
          </View>
        )
      ))}
    </View>
  );
}

function Queue({ label, entry, best, games, openable }) {
  const t = useT();
  const accent = useAccent("lol");

  return (
    <>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {openable ? <Icon name="chevron" size={fontSizes.sm} color={colors.textMuted} /> : null}
      </View>
      {entry ? (
        <>
          <View style={styles.tierRow}>
            <RankEmblem tier={entry.tier} size={sizes.item} />
            <Text style={[styles.tier, { color: colors.tier[entry.tier] || colors.text }]} numberOfLines={1}>{tierLabel(entry.tier, entry.rank)}</Text>
          </View>
          <View style={styles.lpRow}>
            <CountUp value={entry.leaguePoints} style={styles.lp} />
            <Text style={styles.lpUnit}>LP</Text>
          </View>
          <Text style={styles.record}>
            {entry.wins}V · {entry.losses}D · <Text style={{ color: winrateColor(winrate(entry.wins, entry.losses), accent) }}>{winrate(entry.wins, entry.losses)}%</Text>
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.unranked}>{t("ranked.unranked")}</Text>
          <Text style={styles.hint}>{t("ranked.unrankedHint")}</Text>
        </>
      )}

      <Text style={[styles.label, styles.bestLabel]}>{t("lol.bestWinrate")}</Text>
      {best.length ? (
        <View style={styles.bestRow}>
          {best.map(c => (
            <View key={c.name} style={styles.best} accessible accessibilityLabel={`${championLabel(c.name)}, ${c.wr}%, ${t("common.games", { count: c.games })}`}>
              <Image source={{ uri: championIcon(c.name) }} style={styles.bestImg} />
              <Text style={[styles.bestWr, { color: winrateColor(c.wr, accent) }]}>{c.wr}%</Text>
              <Text style={styles.bestGames}>{t("lol.gamesShort", { count: c.games })}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.hint}>{t("lol.noQueueGames", { queue: label, count: games })}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap:      {
    flexDirection: "row", marginBottom: spacing.xl,
    borderTopWidth: sizes.hairline, borderBottomWidth: sizes.hairline, borderColor: colors.border,
  },
  col:       { flex: 1, paddingVertical: spacing.md, paddingRight: spacing.sm },
  colRight:  { borderLeftWidth: sizes.hairline, borderLeftColor: colors.border, paddingLeft: spacing.lg },
  label:     { ...type.label, color: colors.textMuted, letterSpacing: tracking.wide, textTransform: "uppercase" },
  labelRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  pressed:   { opacity: 0.7 },
  tierRow:   { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  tier:      { ...type.heading, fontSize: fontSizes.base, flexShrink: 1 },
  lpRow:     { flexDirection: "row", alignItems: "baseline", gap: spacing.xxs },
  lp:        { ...type.statLarge, fontSize: fontSizes.xxl + spacing.xxs, color: colors.text },
  lpUnit:    { ...type.captionStrong, color: colors.textMuted },
  record:    { ...type.smallStrong, color: colors.textSecondary },
  unranked:  { ...type.heading, color: colors.textSecondary, marginTop: spacing.sm },
  hint:      { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  bestLabel: { marginTop: spacing.md, marginBottom: spacing.sm, fontSize: fontSizes.xxs },
  bestRow:   { flexDirection: "row", gap: spacing.md },
  best:      { alignItems: "center", minWidth: sizes.placement },
  bestImg:   { width: sizes.avatarMd, height: sizes.avatarMd, borderRadius: radii.sm + spacing.xxs, backgroundColor: colors.surfaceHigh, marginBottom: spacing.xs },
  bestWr:    { ...type.stat, fontSize: fontSizes.sm },
  bestGames: { ...type.micro, color: colors.textMuted },
});
