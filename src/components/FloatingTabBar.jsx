import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Icon from "./Icon";
import ExploreSheet from "./ExploreSheet";
import { Glass, GLASS_EDGE, GLASS_LIFT, PressableScale } from "./ui";
import { select } from "../utils/haptics";
import { useT } from "../i18n/I18nProvider";
import { colors, radii, sizes, spacing, type, useAccent, withAlpha } from "../theme";

const ICONS = { Inicio: "home", Favoritos: "heart", Ajustes: "settings" };
const LABELS = { Inicio: "tabs.home", Favoritos: "tabs.favorites", Ajustes: "tabs.settings" };
const SPRING = { damping: 18, stiffness: 200, mass: 0.8 };

// Barra inferior flotante tipo "pill" con un botón circular de búsqueda al lado. Es neutra salvo la pestaña activa, que
// lleva el acento del juego (como en iOS: el color de marca se reserva para la pestaña seleccionada). El fondo de la
// pestaña activa se desliza de una a otra.
export default function FloatingTabBar({ state, navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const [width, setWidth] = useState(0);
  const [barH, setBarH] = useState(0);
  const bottom = Math.max(insets.bottom, spacing.md);
  const [explore, setExplore] = useState(false);
  const itemWidth = width ? (width - (spacing.sm - spacing.xxs) * 2) / state.routes.length : 0;

  const x = useSharedValue(0);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  useEffect(() => { x.value = withSpring(state.index * itemWidth, SPRING); }, [state.index, itemWidth]);

  return (
    <>
    {/* Borde de desplazamiento al estilo iOS: el contenido se funde con el fondo antes de llegar a la barra en vez de
        chocar con ella (un degradado, sin desenfoque: cuesta lo mismo en Android) */}
    {barH > 0 && (
      <View pointerEvents="none" style={[styles.edge, { height: bottom + barH + spacing.xl }]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="tabEdge" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity="0" />
              <Stop offset="0.55" stopColor={colors.bg} stopOpacity="0.6" />
              <Stop offset="1" stopColor={colors.bg} stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#tabEdge)" />
        </Svg>
      </View>
    )}
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      <View style={styles.pill} accessibilityRole="tablist" onLayout={e => { setWidth(e.nativeEvent.layout.width); setBarH(e.nativeEvent.layout.height); }}>
        <Glass style={[StyleSheet.absoluteFill, styles.glass]} intensity={95} />
        {itemWidth > 0 && (
          <Animated.View style={[
            styles.indicator,
            { width: itemWidth },
            indicator,
          ]} />
        )}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const color = focused ? accent : colors.textSecondary;
          return (
            <PressableScale
              key={route.key}
              scaleTo={0.92}
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
            </PressableScale>
          );
        })}
      </View>
      {/* La lupa abre la hoja Explorar (ranking, favoritos en vivo, atajos y el acceso a la búsqueda) */}
      <PressableScale
        scaleTo={0.9}
        style={styles.search}
        accessibilityRole="button"
        accessibilityLabel={t("explore.title")}
        onPress={() => { select(); setExplore(true); }}
      >
        <Glass style={[StyleSheet.absoluteFill, styles.glass]} intensity={95} />
        <View><Icon name="search" size={sizes.item} color={colors.text} /></View>
      </PressableScale>
      <ExploreSheet visible={explore} onClose={() => setExplore(false)} navigation={navigation} />
    </View>
    </>
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
  edge:      { position: "absolute", left: 0, right: 0, bottom: 0 },
  host:      { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", justifyContent: "center", gap: spacing.sm + spacing.xxs },
  pill:      {
    flex: 1, maxWidth: 480, flexDirection: "row", padding: spacing.sm - spacing.xxs,
    borderRadius: radii.pill, borderWidth: sizes.hairline, borderColor: GLASS_EDGE, ...GLASS_LIFT,
  },
  search:    {
    width: sizes.avatarXl - spacing.sm, alignSelf: "stretch", borderRadius: radii.pill, alignItems: "center", justifyContent: "center",
    borderWidth: sizes.hairline, borderColor: GLASS_EDGE, ...GLASS_LIFT,
  },
  glass:     { borderRadius: radii.pill },
  indicator: {
    position: "absolute", top: spacing.sm - spacing.xxs, bottom: spacing.sm - spacing.xxs, left: spacing.sm - spacing.xxs,
    // Una lente de cristal más clara dentro de la barra, con su propio canto en diagonal; sin sombra: no flota aparte
    borderRadius: radii.pill, backgroundColor: withAlpha(colors.text, 0.1),
    boxShadow: `inset 1px 1px 0 ${withAlpha(colors.text, 0.14)}, inset -1px -1px 0 ${withAlpha(colors.text, 0.05)}`,
  },
  item:      { flex: 1, minHeight: sizes.placement, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xs, gap: spacing.xxs },
  label:     { ...type.label },
});
