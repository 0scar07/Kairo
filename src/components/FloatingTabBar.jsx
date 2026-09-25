import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { select } from "../utils/haptics";
import { useT } from "../i18n/I18nProvider";
import { colors, radii, sizes, spacing, fontSizes, type, glow, useAccent, withAlpha } from "../theme";

const ICONS = { Inicio: "home", Favoritos: "heart", Ajustes: "settings" };
const LABELS = { Inicio: "tabs.home", Favoritos: "tabs.favorites", Ajustes: "tabs.settings" };
const SPRING = { damping: 18, stiffness: 200, mass: 0.8 };

// Barra inferior flotante tipo "pill": el fondo del tab activo se desliza con el acento del juego
export default function FloatingTabBar({ state, navigation }) {
  const t = useT();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const itemWidth = width ? (width - spacing.sm * 2) / state.routes.length : 0;

  const x = useSharedValue(0);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  useEffect(() => { x.value = withSpring(state.index * itemWidth, SPRING); }, [state.index, itemWidth]);

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.pill} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {itemWidth > 0 && (
          <Animated.View style={[
            styles.indicator,
            { width: itemWidth, backgroundColor: withAlpha(accent, 0.16), borderColor: withAlpha(accent, 0.45) },
            indicator,
          ]} />
        )}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const color = focused ? accent : colors.textMuted;
          return (
            <Pressable
              key={route.key}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={t(LABELS[route.name])}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) { select(); navigation.navigate(route.name); }
              }}
            >
              <Icon name={ICONS[route.name]} size={sizes.item - spacing.xs} color={color} />
              <Text style={[styles.label, { color }]}>{t(LABELS[route.name])}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host:      { position: "absolute", left: 0, right: 0, alignItems: "center" },
  pill:      {
    flexDirection: "row", padding: spacing.sm, minWidth: "72%",
    backgroundColor: withAlpha(colors.surfaceRaised, 0.96), borderRadius: radii.pill,
    borderWidth: sizes.hairline, borderColor: colors.borderStrong,
    ...glow(colors.bg, spacing.lg, 0.9),
  },
  indicator: {
    position: "absolute", top: spacing.sm, bottom: spacing.sm, left: spacing.sm,
    borderRadius: radii.pill, borderWidth: sizes.hairline,
  },
  item:      { flex: 1, alignItems: "center", paddingVertical: spacing.sm, gap: spacing.xxs },
  label:     { ...type.label, fontSize: fontSizes.xxs },
});
