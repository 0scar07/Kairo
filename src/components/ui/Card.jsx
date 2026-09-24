import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radii, spacing, sizes } from "../../theme";

// Superficie base: fondo en capa, borde sutil y esquinas redondeadas.
// `accent` pinta el borde izquierdo (ej. color de rango).
export default function Card({ children, style, accent, padded = true }) {
  return (
    <View style={[
      styles.card,
      padded && styles.padded,
      accent && { borderLeftColor: accent, borderLeftWidth: sizes.borderAccent },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: sizes.hairline,
    borderColor: colors.border,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
  },
  padded: { padding: spacing.lg },
});
