import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { colors, radii, sizes, spacing, glow } from "../../theme";

// value: 0-100. Relleno del color dado que se llena al aparecer; `glowing` añade un resplandor del mismo color.
// Con "Reducir movimiento" Reanimated salta directamente al valor final.
export default function ProgressBar({ value, color, height = sizes.bar, width, style, glowing, delay = 150 }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [pct]);

  const fill = useAnimatedStyle(() => ({ width: `${p.value}%` }));

  return (
    <View
      style={[styles.track, { height, width }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
    >
      <Animated.View style={[
        styles.fill,
        { backgroundColor: color },
        glowing && glow(color, spacing.sm),
        fill,
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.surfaceHigh, borderRadius: radii.pill },
  fill:  { height: "100%", borderRadius: radii.pill },
});
