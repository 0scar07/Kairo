import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, spacing, type, tracking } from "../../theme";

export default function SectionLabel({ children, style }) {
  // Los hijos pueden ser varios (texto + variables): se unen sin separadores
  const text = React.Children.toArray(children).join("");
  return <Text style={[styles.label, style]}>{text.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
    marginBottom: spacing.sm,
  },
});
