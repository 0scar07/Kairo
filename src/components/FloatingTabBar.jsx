import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "./Icon";
import ExploreSheet from "./ExploreSheet";
import { Glass } from "./ui";
import { select } from "../utils/haptics";
import { useT } from "../i18n/I18nProvider";
import { colors, radii, sizes, spacing, type, glow, withAlpha } from "../theme";

const ICONS = { Inicio: "home", Favoritos: "heart", Ajustes: "settings" };
const LABELS = { Inicio: "tabs.home", Favoritos: "tabs.favorites", Ajustes: "tabs.settings" };
const SPRING = { damping: 18, stiffness: 200, mass: 0.8 };

// Barra inferior flotante tipo "pill" con un botón circular de búsqueda al lado. Es neutra (sin el acento del juego):
// el color queda para el contenido. El fondo de la pestaña activa se desliza de una a otra.
export default function FloatingTabBar({ state, navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [explore, setExplore] = useState(false);
  const itemWidth = width ? (width - (spacing.sm - spacing.xxs) * 2) / state.routes.length : 0;

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
            { width: itemWidth },
            indicator,
          ]} />
        )}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const color = focused ? colors.text : colors.textSecondary;
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
      {/* La lupa abre la hoja Explorar (ranking, favoritos en vivo, atajos y el acceso a la búsqueda) */}
      <Pressable
        style={({ pressed }) => [styles.search, pressed && styles.searchPressed]}
        accessibilityRole="button"
        accessibilityLabel={t("explore.title")}
        onPress={() => { select(); setExplore(true); }}
      >
        <Glass style={[StyleSheet.absoluteFill, styles.glass]} intensity={70} />
        <View><Icon name="search" size={sizes.item} color={colors.text} /></View>
      </Pressable>
      <ExploreSheet visible={explore} onClose={() => setExplore(false)} navigation={navigation} />
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
  host:      { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", justifyContent: "center", gap: spacing.sm + spacing.xxs },
  pill:      {
    flex: 1, maxWidth: 480, flexDirection: "row", padding: spacing.sm - spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: sizes.hairline, borderColor: colors.borderStrong,
    ...glow(colors.bg, spacing.lg, 0.9),
  },
  search:    {
    width: sizes.avatarXl - spacing.sm, alignSelf: "stretch", borderRadius: radii.pill, alignItems: "center", justifyContent: "center",
    borderWidth: sizes.hairline, borderColor: colors.borderStrong, ...glow(colors.bg, spacing.lg, 0.9),
  },
  searchPressed: { opacity: 0.7 },
  glass:     { borderRadius: radii.pill },
  indicator: {
    position: "absolute", top: spacing.sm - spacing.xxs, bottom: spacing.sm - spacing.xxs, left: spacing.sm - spacing.xxs,
    borderRadius: radii.pill, backgroundColor: withAlpha(colors.text, 0.13),
  },
  item:      { flex: 1, minHeight: sizes.placement, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xs, gap: spacing.xxs },
  label:     { ...type.label },
});
