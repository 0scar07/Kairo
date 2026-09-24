import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../../theme";

// Botón "cargar más": se desactiva mientras carga o cuando ya no hay más
export default function LoadMoreButton({ loading, hasMore, onPress, game }) {
  const accent = useAccent(game);
  const disabled = loading || !hasMore;
  return (
    <TouchableOpacity
      style={[styles.btn, { borderColor: withAlpha(accent, 0.4) }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, { color: accent }]}>
        {loading ? "Cargando..." : hasMore ? "⬇ Cargar más partidas" : "No hay más partidas"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: spacing.md, padding: spacing.lg,
    backgroundColor: colors.surface, borderWidth: sizes.hairline,
    borderRadius: radii.md, alignItems: "center",
  },
  text:     { ...type.bodyStrong },
  disabled: { opacity: 0.5 },
});
