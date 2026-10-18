import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { useT } from "../../../i18n/I18nProvider";
import { SectionLabel } from "../../../components/ui";
import { winrate } from "../../../utils/format";
import { colors, radii, sizes, spacing, fontSizes, type, winrateColor, useAccent } from "../../../theme";

// Clasificación de una liga profesional: una tabla por grupo (# · Equipo · V-D · Winrate). Tocar un equipo lo abre.
export default function ProStandings({ sections, onTeam }) {
  const t = useT();
  const accent = useAccent("lol");
  return sections.map(sec => (
    <View key={sec.name} style={styles.section}>
      {sections.length > 1 ? <SectionLabel>{sec.name}</SectionLabel> : null}
      <View style={styles.table}>
        <View style={[styles.row, styles.head]} accessibilityRole="header">
          <Text style={[styles.headText, styles.pos]}>#</Text>
          <Text style={[styles.headText, styles.team]}>{t("pros.team")}</Text>
          <Text style={[styles.headText, styles.record]}>{t("pros.record")}</Text>
          <Text style={[styles.headText, styles.wr]}>{t("stats.winrate")}</Text>
        </View>
        {sec.rows.map(r => {
          const wr = r.wins + r.losses ? winrate(r.wins, r.losses) : null;
          return (
            <Pressable
              key={`${sec.name}-${r.slug}`}
              onPress={() => onTeam(r)}
              style={({ pressed }) => [styles.row, styles.body, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${r.position}. ${r.name}, ${r.wins}-${r.losses}${wr != null ? `, ${wr}%` : ""}`}
            >
              <Text style={[styles.posText, styles.pos, { color: colors.rank[r.position - 1] || colors.textMuted }]}>{r.position}</Text>
              <View style={[styles.team, styles.teamCell]}>
                {r.image ? <Image source={{ uri: r.image }} style={styles.logo} resizeMode="contain" /> : <View style={styles.logo} />}
                <View style={styles.names}>
                  <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.code}>{r.code}</Text>
                </View>
              </View>
              <Text style={[styles.value, styles.record]}>{r.wins}-{r.losses}</Text>
              <Text style={[styles.value, styles.wr, wr != null && { color: winrateColor(wr, accent) }]}>{wr != null ? `${wr}%` : "–"}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  ));
}

const styles = StyleSheet.create({
  section:  { marginBottom: spacing.md },
  table:    { borderRadius: radii.lg, overflow: "hidden", borderWidth: sizes.hairline, borderColor: colors.border, backgroundColor: colors.surface },
  row:      { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md },
  head:     { minHeight: spacing.xxl + spacing.xxs, backgroundColor: colors.surfaceRaised },
  headText: { ...type.label, color: colors.textMuted },
  body:     { minHeight: sizes.button + spacing.sm, borderTopWidth: sizes.hairline, borderTopColor: colors.border, paddingVertical: spacing.xs },
  pressed:  { backgroundColor: colors.surfaceRaised },
  pos:      { width: spacing.xl + spacing.xs },
  posText:  { ...type.stat, fontSize: fontSizes.base, fontVariant: ["tabular-nums"] },
  team:     { flex: 1, minWidth: 0 },
  teamCell: { flexDirection: "row", alignItems: "center", gap: spacing.sm + spacing.xxs, paddingRight: spacing.sm },
  logo:     { width: sizes.avatarSm, height: sizes.avatarSm },
  names:    { flex: 1, minWidth: 0 },
  name:     { ...type.bodyStrong, fontSize: fontSizes.base, color: colors.text },
  code:     { ...type.caption, color: colors.textMuted },
  record:   { width: sizes.avatarXl - spacing.md, textAlign: "right" },
  wr:       { width: sizes.avatarXl - spacing.md, textAlign: "right" },
  value:    { ...type.stat, fontSize: fontSizes.base, color: colors.text, fontVariant: ["tabular-nums"] },
});
