import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import PressableScale from "./PressableScale";
import Icon from "../Icon";
import { select } from "../../utils/haptics";
import { colors, radii, sizes, spacing, fontSizes, type, tracking, useAccent, withAlpha } from "../../theme";

const SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

// tabs: [{ key, label, icon? }]. Un indicador se desliza hasta el tab activo, que toma el acento del juego.
export default function SegmentedTabs({ tabs, value, onChange, game }) {
  const accent = useAccent(game);
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex(t => t.key === value));
  const tabWidth = width ? (width - spacing.xs * 2) / tabs.length : 0;

  const x = useSharedValue(0);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  React.useEffect(() => {
    x.value = withSpring(index * tabWidth, SPRING);
  }, [index, tabWidth]);

  return (
    <View style={styles.wrap} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {tabWidth > 0 && (
        <Animated.View style={[
          styles.indicator,
          { width: tabWidth, backgroundColor: withAlpha(accent, 0.14), borderColor: withAlpha(accent, 0.35) },
          indicator,
        ]} />
      )}
      {tabs.map(t => {
        const active = t.key === value;
        return (
          <PressableScale
            key={t.key}
            scaleTo={0.96}
            style={styles.tab}
            onPress={() => { if (!active) { select(); onChange(t.key); } }}
          >
            {t.icon ? <Icon name={t.icon} size={fontSizes.base} color={active ? accent : colors.textMuted} /> : null}
            <Text style={[styles.text, active && { color: accent }]}>{t.label}</Text>
          </PressableScale>
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
  indicator: {
    position: "absolute", top: spacing.xs, bottom: spacing.xs, left: spacing.xs,
    borderRadius: radii.sm, borderWidth: sizes.hairline,
  },
  tab:       { flex: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: radii.sm },
  text:      { ...type.label, fontSize: fontSizes.sm, color: colors.textMuted, letterSpacing: tracking.wide },
});
