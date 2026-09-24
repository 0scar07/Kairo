import React from "react";
import { Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../../theme";

// Botón tipo píldora para filtros; opcionalmente con imagen
export default function Chip({ label, active, onPress, image, game }) {
  const accent = useAccent(game);
  return (
    <TouchableOpacity
      style={[styles.chip, active && { borderColor: accent, backgroundColor: withAlpha(accent, 0.12) }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {image ? <Image source={{ uri: image }} style={styles.img} /> : null}
      <Text style={[styles.text, active && { color: accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.pill, backgroundColor: colors.surface,
    borderWidth: sizes.hairline, borderColor: colors.border, marginRight: spacing.sm,
  },
  img:  { width: sizes.avatarXs, height: sizes.avatarXs, borderRadius: radii.xs },
  text: { ...type.smallStrong, color: colors.textMuted },
});
