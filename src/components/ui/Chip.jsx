import React from "react";
import { Text, Image, StyleSheet } from "react-native";
import PressableScale from "./PressableScale";
import { select } from "../../utils/haptics";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../../theme";

// Botón tipo píldora para filtros; opcionalmente con imagen
export default function Chip({ label, active, onPress, image, game }) {
  const accent = useAccent(game);
  return (
    <PressableScale
      style={[styles.chip, active && { borderColor: accent, backgroundColor: withAlpha(accent, 0.12) }]}
      scaleTo={0.94}
      onPress={() => { select(); onPress(); }}
    >
      {image ? <Image source={{ uri: image }} style={styles.img} /> : null}
      <Text style={[styles.text, active && { color: accent }]}>{label}</Text>
    </PressableScale>
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
