import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, radii, sizes, spacing, type, withAlpha } from "../../theme";

const TONES = { warn: colors.gold, error: colors.loss, info: colors.info };

// Aviso discreto dentro de una pantalla (no bloquea el contenido)
export default function Notice({ tone = "info", children }) {
  const color = TONES[tone];
  return (
    <Text style={[styles.notice, { color, borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.08) }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  notice: {
    ...type.small, padding: spacing.md, marginBottom: spacing.lg,
    borderWidth: sizes.hairline, borderRadius: radii.md,
  },
});
