import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, spacing, type, tracking } from "../../theme";

export default function SectionLabel({ children, style }) {
  return <Text style={[styles.label, style]}>{String(children).toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: colors.textMuted,
    letterSpacing: tracking.wider,
    marginBottom: spacing.sm,
  },
});
