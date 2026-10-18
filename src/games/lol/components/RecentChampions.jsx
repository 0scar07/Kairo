import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { useT } from "../../../i18n/I18nProvider";
import { Card, SectionLabel } from "../../../components/ui";
import { championIcon, championLabel } from "../../../api/ddragon";
import { colors, radii, sizes, spacing, type } from "../../../theme";

const COLUMNS = 10;
const GAP = spacing.xs + 1;

/**
 * Resultados recientes como los campeones de cada partida (la más reciente arriba a la izquierda): una línea verde
 * o roja debajo de cada ícono y las derrotas apagadas. Tocar uno abre esa partida en la lista.
 *  - games: [{ id, champion, win }]
 */
export default function RecentChampions({ games, onOpen }) {
  const t = useT();
  const [width, setWidth] = useState(0);
  const size = width ? Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS) : 0;   // 10 por fila con su separación
  if (!games.length) return null;
  const wins = games.filter(g => g.win).length;
  return (
    <Card>
      <View style={styles.header}>
        <SectionLabel style={styles.label}>{t("results.recent")}</SectionLabel>
        <Text style={styles.summary}>{t("results.summary", { wins, losses: games.length - wins })}</Text>
      </View>
      <View style={styles.grid} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {games.map(g => (
          <Pressable
            key={g.id}
            onPress={() => onOpen(g.id)}
            style={({ pressed }) => [styles.cell, { width: size, height: size }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${championLabel(g.champion)}, ${g.win ? t("results.victory") : t("results.defeat")}`}
          >
            <Image source={{ uri: championIcon(g.champion) }} style={[styles.icon, !g.win && styles.lost]} />
            <View style={[styles.bar, { backgroundColor: g.win ? colors.win : colors.loss }]} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{t("results.recentHint")}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  label:   { marginBottom: 0 },
  summary: { ...type.smallStrong, color: colors.textSecondary, fontVariant: ["tabular-nums"] },
  grid:    { flexDirection: "row", flexWrap: "wrap", gap: GAP, marginTop: spacing.md },
  cell:    { borderRadius: radii.sm + 1, overflow: "hidden", backgroundColor: colors.surfaceHigh },
  pressed: { opacity: 0.7 },
  icon:    { width: "100%", height: "100%" },
  lost:    { opacity: 0.45 },
  bar:     { position: "absolute", left: 0, right: 0, bottom: 0, height: sizes.bar },
  hint:    { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
});
