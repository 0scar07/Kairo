import React from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Glass from "./ui/Glass";
import { colors, sizes, spacing, type } from "../theme";

const BAR_HEIGHT = 48;

/**
 * Título grande al estilo iOS: al hacer scroll pasado el título, aparece una barra compacta arriba
 * con el mismo título en pequeño. Uso:
 *   const { onScroll, y } = useLargeTitle();
 *   <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}> … <LargeTitle y={y}>Favoritos</LargeTitle> …
 *   <CompactTitleBar y={y} title="Favoritos" />   (hermano del ScrollView, encima)
 */
export function useLargeTitle() {
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => { y.value = e.contentOffset.y; });
  return { y, onScroll };
}

// El título grande crece un poco al tirar hacia abajo (como en iOS)
export function LargeTitle({ y, children, style }) {
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(y.value, [-120, 0], [1.1, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <Animated.Text style={[styles.large, { transformOrigin: "left center" }, animated, style]} accessibilityRole="header">
      {children}
    </Animated.Text>
  );
}

export function CompactTitleBar({ y, title, threshold = 56 }) {
  const insets = useSafeAreaInsets();
  const bar = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [threshold - 16, threshold + 8], [0, 1], Extrapolation.CLAMP),
  }));
  const text = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.value, [threshold - 16, threshold + 8], [8, 0], Extrapolation.CLAMP) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, { paddingTop: insets.top, height: insets.top + BAR_HEIGHT }, bar]}
    >
      {/* Barra pegada al borde: sin cantos iluminados, solo la línea inferior que la separa del contenido */}
      <Glass style={StyleSheet.absoluteFill} intensity={70} rim={false} />
      {/* Borde de desplazamiento, como el de la barra inferior: el contenido se funde antes de pasar bajo la barra en vez
          de cortarse en seco. Aparece con ella (vive dentro de la barra) y es un degradado, sin desenfoque */}
      <Animated.View style={styles.edge}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="titleEdge" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity="0.85" />
              <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#titleEdge)" />
        </Svg>
      </Animated.View>
      <Animated.Text style={[styles.compact, text]} numberOfLines={1}>{title}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  large:   { ...type.largeTitle, color: colors.text },
  bar:     {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    alignItems: "center", justifyContent: "center",
    borderBottomWidth: sizes.hairline, borderBottomColor: colors.border,
  },
  compact: { ...type.heading, color: colors.text, paddingHorizontal: spacing.xxxl },
  edge:    { position: "absolute", top: "100%", left: 0, right: 0, height: spacing.xl + spacing.sm },
});
