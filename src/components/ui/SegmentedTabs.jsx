import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, radii, spacing, fontSizes, type, tracking, useAccent } from "../../theme";

// tabs: [{ key, label }]. El tab activo usa el acento del juego.
export default function SegmentedTabs({ tabs, value, onChange, game }) {
  const accent = useAccent(game);
  return (
    <View style={styles.wrap}>
      {tabs.map(t => {
        const active = t.key === value;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.text, active && { color: accent }]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      {
    flexDirection: "row", marginBottom: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.xs,
  },
  tab:       { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radii.sm },
  tabActive: { backgroundColor: colors.surfaceRaised },
  text:      { ...type.label, fontSize: fontSizes.sm, color: colors.textMuted, letterSpacing: tracking.wide },
});
