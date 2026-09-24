import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "../Icon";
import { colors, radii, sizes, spacing, fontSizes, type, withAlpha } from "../../theme";

const TONES = { warn: colors.gold, error: colors.loss, info: colors.info };

// Aviso discreto dentro de una pantalla (no bloquea el contenido). icon: nombre de Icon.jsx
export default function Notice({ tone = "info", icon, children }) {
  const color = TONES[tone];
  return (
    <View style={[styles.notice, { borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.08) }]}>
      {icon ? <Icon name={icon} size={fontSizes.base} color={color} /> : null}
      <Text style={[styles.text, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md, marginBottom: spacing.lg, borderWidth: sizes.hairline, borderRadius: radii.md,
  },
  text: { ...type.small, flex: 1 },
});
