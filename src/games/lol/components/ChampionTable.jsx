import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useT } from "../../../i18n/I18nProvider";
import { Card } from "../../../components/ui";
import { championIcon, championLabel } from "../../../api/ddragon";
import { colors, radii, sizes, spacing, fontSizes, type, kdaColor, winrateColor, useAccent } from "../../../theme";

// Campeones más jugados como tabla: Partidas · KDA · Winrate en columnas alineadas. `ranked` muestra el puesto (#1, #2…).
export default function ChampionTable({ champs, ranked }) {
  const t = useT();
  const accent = useAccent("lol");
  return (
    <Card padded={false} style={styles.card}>
      <View style={[styles.row, styles.head]} accessibilityRole="header">
        <Text style={[styles.headText, styles.first]}>{t("lol.colChampion")}</Text>
        <Text style={[styles.headText, styles.games]}>{t("stats.matches")}</Text>
        <Text style={[styles.headText, styles.kda]}>KDA</Text>
        <Text style={[styles.headText, styles.wr]}>{t("stats.winrate")}</Text>
      </View>
      {champs.map((c, i) => (
        <View
          key={c.name}
          style={[styles.row, styles.body]}
          accessible
          accessibilityLabel={`${championLabel(c.name)}: ${t("common.games", { count: c.games })}, ${c.kda} KDA, ${c.wr}%`}
        >
          <View style={[styles.first, styles.champ]}>
            {ranked ? <Text style={[styles.rank, { color: colors.rank[i] || colors.textMuted }]}>#{i + 1}</Text> : null}
            <Image source={{ uri: championIcon(c.name) }} style={styles.img} />
            <View style={styles.names}>
              <Text style={styles.name} numberOfLines={1}>{championLabel(c.name)}</Text>
              <Text style={styles.avg} numberOfLines={1}>{c.kills} / {c.deaths} / {c.assists}</Text>
            </View>
          </View>
          <Text style={[styles.cell, styles.games]}>{c.games}</Text>
          <Text style={[styles.cell, styles.kda, { color: kdaColor(c.kda, colors.text) }]}>{c.kda}</Text>
          <Text style={[styles.cell, styles.wr, styles.wrText, { color: winrateColor(c.wr, accent) }]}>{c.wr}%</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card:     { overflow: "hidden" },
  row:      { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  head:     { minHeight: spacing.xxxl - spacing.sm, backgroundColor: colors.surfaceRaised },
  headText: { ...type.label, color: colors.textMuted },
  body:     { minHeight: sizes.button + spacing.md, borderTopWidth: sizes.hairline, borderTopColor: colors.border, paddingVertical: spacing.sm },
  first:    { flex: 1, minWidth: 0 },
  champ:    { flexDirection: "row", alignItems: "center", gap: spacing.sm + spacing.xxs },
  rank:     { ...type.captionStrong, minWidth: spacing.lg + spacing.xs },
  img:      { width: sizes.avatarLg, height: sizes.avatarLg, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  names:    { flex: 1, minWidth: 0 },
  name:     { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  avg:      { ...type.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  games:    { width: sizes.avatarXl - spacing.sm, textAlign: "right" },
  kda:      { width: sizes.avatarXl - spacing.lg, textAlign: "right" },
  wr:       { width: sizes.avatarXl - spacing.xs, textAlign: "right" },
  cell:     { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text, fontVariant: ["tabular-nums"] },
  wrText:   { ...type.stat, fontSize: fontSizes.base },
});
