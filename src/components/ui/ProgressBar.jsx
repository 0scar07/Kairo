import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radii, sizes, spacing, glow } from "../../theme";

// value: 0-100. Relleno del color dado; `glowing` añade un resplandor del mismo color
export default function ProgressBar({ value, color, height = sizes.bar, width, style, glowing }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  return (
    <View style={[styles.track, { height, width }, style]}>
      <View style={[
        styles.fill,
        { width: `${pct}%`, backgroundColor: color },
        glowing && glow(color, spacing.sm),
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.surfaceHigh, borderRadius: radii.pill },
  fill:  { height: "100%", borderRadius: radii.pill },
});
