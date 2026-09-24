import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { colors, radii, sizes, spacing, type } from "../../theme";

/**
 * Fila de una batalla (Brawl Stars y Clash Royale): franja de color del resultado, imagen opcional,
 * título y subtítulo a la izquierda, y dato principal + secundario a la derecha.
 */
export default function BattleRow({ color, image, result, title, subtitle, value, valueColor, valueSub }) {
  return (
    <View style={[styles.row, { borderLeftColor: color }]}>
      {image ? <Image source={{ uri: image }} style={styles.image} resizeMode="cover" /> : null}
      <View style={styles.info}>
        <Text style={[styles.result, { color }]} numberOfLines={1}>{result}</Text>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>
        {value != null ? <Text style={[styles.value, { color: valueColor || colors.text }]}>{value}</Text> : null}
        {valueSub ? <Text style={styles.valueSub}>{valueSub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:      {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.surface, borderLeftWidth: sizes.borderAccent, borderRadius: radii.md, marginBottom: spacing.sm,
  },
  image:    { width: sizes.avatarLg + spacing.sm, height: sizes.avatarLg + spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceHigh },
  info:     { flex: 1, minWidth: 0 },
  result:   { ...type.label },
  title:    { ...type.bodyStrong, color: colors.text },
  subtitle: { ...type.caption, color: colors.textMuted },
  right:    { alignItems: "flex-end" },
  value:    { ...type.stat },
  valueSub: { ...type.caption, color: colors.textSecondary },
});
