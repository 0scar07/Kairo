import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import { Glass } from "./ui";
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
      <View style={styles.pill} accessibilityRole="tablist" onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        <Glass style={[StyleSheet.absoluteFill, styles.glass]} intensity={70} />
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
              accessibilityRole="tab"
              accessibilityLabel={t(LABELS[route.name])}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) { select(); navigation.navigate(route.name); }
              }}
            >
              <TabIcon name={ICONS[route.name]} focused={focused} color={color} />
              <Text style={[styles.label, { color }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>{t(LABELS[route.name])}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// El ícono da un pequeño rebote cuando su pestaña pasa a estar activa
function TabIcon({ name, focused, color }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (focused) s.value = withSequence(withSpring(1.18, { damping: 10, stiffness: 400 }), withSpring(1, SPRING));
  }, [focused]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={animated}>
      <Icon name={name} size={sizes.item - spacing.xs} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host:      { position: "absolute", left: 0, right: 0, alignItems: "center" },
  pill:      {
    flexDirection: "row", padding: spacing.sm, minWidth: "72%",
    borderRadius: radii.pill,
    borderWidth: sizes.hairline, borderColor: colors.borderStrong,
    ...glow(colors.bg, spacing.lg, 0.9),
  },
  glass:     { borderRadius: radii.pill },
  indicator: {
    position: "absolute", top: spacing.sm, bottom: spacing.sm, left: spacing.sm,
    borderRadius: radii.pill, borderWidth: sizes.hairline,
  },
  item:      { flex: 1, minHeight: sizes.placement, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xs, gap: spacing.xxs },
  label:     { ...type.label },
});
