import React from "react";
import { useT } from "../../../i18n/I18nProvider";
import { View, Text, Image, StyleSheet } from "react-native";
import { Card, SectionLabel } from "../../../components/ui";
import { championByKey, championIcon, championLabel } from "../../../api/ddragon";
import { formatNumber } from "../../../utils/format";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../../../theme";

// Maestría de campeones: los 3 con más puntos (nivel y puntos) y el nivel total de maestría
export default function MasteryCard({ mastery }) {
  const t = useT();
  const accent = useAccent("lol");
  const top = (mastery?.top || []).map(m => ({ ...m, champ: championByKey(m.championId) })).filter(m => m.champ);
  if (!top.length) return null;

  return (
    <Card>
      <View style={styles.header}>
        <SectionLabel style={styles.label}>{t("lol.mastery")}</SectionLabel>
        <Text style={styles.score}>{t("lol.masteryTotal", { score: formatNumber(mastery.score) })}</Text>
      </View>
      <View style={styles.row}>
        {top.map(m => (
          <View key={m.championId} style={styles.col}>
            <View>
              <Image source={{ uri: championIcon(m.champ.name) }} style={[styles.img, { borderColor: withAlpha(accent, 0.5) }]} />
              <View style={[styles.level, { backgroundColor: accent }]}>
                <Text style={styles.levelText}>{m.level}</Text>
              </View>
            </View>
            <Text style={styles.name} numberOfLines={1}>{championLabel(m.champ.name)}</Text>
            <Text style={styles.points}>{t("lol.points", { points: formatNumber(m.points) })}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  label:     { marginBottom: 0 },
  score:     { ...type.smallStrong, color: colors.textSecondary },
  row:       { flexDirection: "row", justifyContent: "space-around" },
  col:       { alignItems: "center", flex: 1, gap: spacing.xs },
  img:       { width: sizes.iconHero - spacing.xl, height: sizes.iconHero - spacing.xl, borderRadius: radii.lg, borderWidth: sizes.borderThick, backgroundColor: colors.surfaceHigh },
  level:     {
    position: "absolute", right: -spacing.xs, bottom: -spacing.xs,
    minWidth: sizes.item, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs,
    borderRadius: radii.pill, alignItems: "center",
  },
  levelText: { ...type.label, color: colors.onAccent },
  name:      { ...type.smallStrong, color: colors.text, marginTop: spacing.xs },
  points:    { ...type.caption, color: colors.textMuted },
});
